-- Reversión de 20261002130000_laofi_gestion. Borra reservas, fidelización,
-- reseñas y facturas TicketBAI (¡registro fiscal! no revertir con facturas
-- emitidas sin exportarlas antes). Restaura laofi.tabla_admin y
-- public.laofi_admin_salon de 20261002120000 (copiadas literalmente).
-- Ejecutar ANTES que las reversiones anteriores.
drop function if exists public.laofi_get_config_reservas(uuid);
drop function if exists public.laofi_crear_reserva(uuid, jsonb);
drop function if exists public.laofi_get_resenas(uuid);
drop function if exists public.laofi_crear_resena(uuid, jsonb);
drop function if exists public.laofi_admin_reservas(date, date);
drop function if exists public.laofi_admin_guardar_reserva(jsonb);
drop function if exists public.laofi_admin_reserva_estado(uuid, text);
drop function if exists public.laofi_admin_menu_dia(date);
drop function if exists public.laofi_admin_guardar_menu_dia(jsonb);
drop function if exists public.laofi_admin_ventas(date, date);
drop function if exists public.laofi_tbai_lineas(uuid[]);
drop function if exists public.laofi_tbai_buscar(uuid[]);
drop function if exists public.laofi_tbai_crear(jsonb);
drop function if exists public.laofi_tbai_actualizar(uuid, jsonb);
drop function if exists public.laofi_vincular_staff(uuid, text, text);

create or replace function public.laofi_admin_salon()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'zonas', coalesce((select jsonb_agg(to_jsonb(z) order by z.orden, z.nombre) from laofi.zonas z where z.activa), '[]'::jsonb),
    'mesas', coalesce((select jsonb_agg(jsonb_build_object(
        'id', m.id, 'zona_id', m.zona_id, 'numero', m.numero, 'nombre', m.nombre, 'capacidad', m.capacidad,
        'forma', m.forma, 'pos_x', m.pos_x, 'pos_y', m.pos_y, 'rotacion', m.rotacion, 'token', m.token,
        'activa', m.activa, 'ocupada', m.ocupada, 'comensales', m.comensales, 'entrada_at', m.entrada_at,
        'bloqueada', m.bloqueada, 'bloqueo_motivo', m.bloqueo_motivo, 'por_limpiar', m.por_limpiar,
        'union_grupo_id', m.union_grupo_id, 'nota', m.nota,
        'sesion', (select jsonb_build_object('id', s.id, 'modo', s.modo,
                     'participantes', (select count(*) from laofi.sesion_participantes sp where sp.sesion_id = s.id))
                   from laofi.mesa_sesiones s where s.mesa_id = m.id and s.estado = 'ACTIVA'),
        'importe_centimos', coalesce((select sum(p.total_centimos) from laofi.pedidos p
                                      where p.mesa_id = m.id and m.entrada_at is not null and p.created_at >= m.entrada_at and p.estado <> 'CANCELLED'), 0),
        'pendiente_centimos', laofi.pendiente_mesa(m.id),
        'pedidos_en_curso', (select count(*) from laofi.pedidos p where p.mesa_id = m.id and p.estado not in ('DELIVERED', 'CANCELLED')),
        'aviso_camarero', exists (select 1 from laofi.avisos a where a.mesa_id = m.id and a.tipo = 'CAMARERO' and a.atendido_at is null),
        'pide_cuenta', exists (select 1 from laofi.avisos a where a.mesa_id = m.id and a.tipo = 'CUENTA' and a.atendido_at is null)
      ) order by m.numero) from laofi.mesas m where m.activa), '[]'::jsonb)
  )
  where laofi.mi_rol() in ('admin', 'encargado', 'camarero');
$$;

create or replace function laofi.tabla_admin(p_tabla text)
returns table (pk text, roles text[], orden text)
language sql
immutable
set search_path = ''
as $$
  select t.pk, t.roles, t.orden from (values
    ('categorias', 'id', '{admin,encargado}'::text[], 'orden, nombre'),
    ('productos', 'id', '{admin,encargado}'::text[], 'orden, nombre'),
    ('modificadores', 'id', '{admin,encargado}'::text[], 'orden, nombre'),
    ('modificador_opciones', 'id', '{admin,encargado}'::text[], 'orden, nombre'),
    ('menus_dia', 'id', '{admin,encargado}'::text[], 'fecha desc'),
    ('menu_dia_platos', 'id', '{admin,encargado}'::text[], 'tipo, orden'),
    ('eventos', 'id', '{admin,encargado}'::text[], 'fecha desc'),
    ('horario', 'dia', '{admin,encargado}'::text[], 'dia'),
    ('zonas', 'id', '{admin,encargado}'::text[], 'orden, nombre'),
    ('mesas', 'id', '{admin,encargado}'::text[], 'numero'),
    ('ajustes', 'clave', '{admin}'::text[], 'clave'),
    ('staff', 'user_id', '{admin}'::text[], 'nombre')
  ) as t(nombre, pk, roles, orden)
  where t.nombre = p_tabla;
$$;

drop function if exists laofi.reserva_proxima(uuid);
drop function if exists laofi.reserva_json(laofi.reservas);
drop table if exists laofi.ticketbai_facturas;
drop table if exists laofi.resenas;
drop table if exists laofi.premios_otorgados;
drop table if exists laofi.reserva_mesas;
drop table if exists laofi.reservas;
drop table if exists laofi.reglas_promocion;
drop table if exists laofi.comensales;
drop function if exists laofi.evaluar_premios();
drop function if exists laofi.vincular_comensal();
drop function if exists laofi.hora_en_rango(time, time, time);
drop function if exists laofi.fidelizacion_activa();
delete from laofi.ajustes where clave in ('reservas', 'fidelizacion', 'resenas', 'fiscal', 'ticketbai');
