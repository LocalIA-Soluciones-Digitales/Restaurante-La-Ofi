-- =============================================================================
-- Restaurante La Ofi — servicio de sala: camarero por zona/mesa, platos listos
-- para servir, limpieza en bloque e historial de ocupaciones (informes)
-- -----------------------------------------------------------------------------
-- Aditiva dentro de laofi. Redefine dos funciones propias (laofi_admin_mesa de
-- 20261002120000 y laofi_admin_salon de 20261002130000); la reversión restaura
-- las versiones anteriores literalmente.
-- Reversión: supabase/rollback/20261002140000_laofi_servicio.down.sql
-- =============================================================================

-- Camarero asignado: por zona (por defecto) y, si se quiere, por mesa.
alter table laofi.zonas add column camarero_id uuid references laofi.staff(user_id) on delete set null;
alter table laofi.mesas add column camarero_id uuid references laofi.staff(user_id) on delete set null;

-- Historial de ocupaciones: una fila cada vez que se libera una mesa.
create table laofi.ocupaciones (
  id uuid primary key default gen_random_uuid(),
  mesa_id uuid not null references laofi.mesas(id) on delete cascade,
  zona_id uuid references laofi.zonas(id) on delete set null,
  entrada_at timestamptz not null,
  salida_at timestamptz not null default now(),
  comensales smallint not null default 0 check (comensales >= 0),
  importe_centimos integer not null default 0 check (importe_centimos >= 0),
  check (salida_at >= entrada_at)
);
create index ocupaciones_salida_idx on laofi.ocupaciones (salida_at);
alter table laofi.ocupaciones enable row level security;
create policy ocupaciones_gestores on laofi.ocupaciones for all to authenticated using (laofi.es_gestor()) with check (laofi.es_gestor());
revoke all on laofi.ocupaciones from public, anon;
grant select, insert, update, delete on laofi.ocupaciones to authenticated;
grant all on laofi.ocupaciones to service_role;

create or replace function public.laofi_admin_mesa(p_mesa uuid, p_accion text, p_datos jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  m laofi.mesas;
  v_destino laofi.mesas;
  v_grupo uuid;
begin
  perform laofi.exigir_rol('admin', 'encargado', 'camarero');
  select * into m from laofi.mesas where id = p_mesa for update;
  if m.id is null then raise exception 'Mesa no encontrada' using errcode = 'P0001'; end if;

  case p_accion
    when 'sentar' then
      update laofi.mesas set ocupada = true, por_limpiar = false,
        comensales = greatest(1, coalesce((p_datos ->> 'comensales')::int, 1)), entrada_at = coalesce(entrada_at, now())
      where id = p_mesa;
    when 'comensales' then
      update laofi.mesas set comensales = greatest(0, (p_datos ->> 'comensales')::int) where id = p_mesa;
    when 'liberar' then
      if laofi.pendiente_mesa(p_mesa) > 0 and not coalesce((p_datos ->> 'forzar')::boolean, false) then
        raise exception 'La mesa tiene importe pendiente de cobro' using errcode = 'P0001';
      end if;
      -- Historial de ocupaciones (tiempo medio y rotación en Ventas e informes).
      if m.entrada_at is not null then
        insert into laofi.ocupaciones (mesa_id, zona_id, entrada_at, comensales, importe_centimos)
        values (m.id, m.zona_id, m.entrada_at, m.comensales,
                coalesce((select sum(p.total_centimos) from laofi.pedidos p
                          where p.mesa_id = m.id and p.created_at >= m.entrada_at and p.estado <> 'CANCELLED'), 0));
      end if;
      update laofi.mesa_sesiones set estado = 'CERRADA', closed_at = now() where mesa_id = p_mesa and estado = 'ACTIVA';
      update laofi.avisos set atendido_at = now(), atendido_por = auth.uid() where mesa_id = p_mesa and atendido_at is null;
      update laofi.mesas set ocupada = false, comensales = 0, entrada_at = null, por_limpiar = true, union_grupo_id = null where id = p_mesa;
    when 'limpia' then
      update laofi.mesas set por_limpiar = false where id = p_mesa;
    when 'bloquear' then
      update laofi.mesas set bloqueada = true, bloqueo_motivo = nullif(btrim(p_datos ->> 'motivo'), '') where id = p_mesa;
    when 'desbloquear' then
      update laofi.mesas set bloqueada = false, bloqueo_motivo = null where id = p_mesa;
    when 'nota' then
      update laofi.mesas set nota = nullif(btrim(p_datos ->> 'nota'), '') where id = p_mesa;
    when 'mover' then
      perform laofi.exigir_rol('admin', 'encargado');
      update laofi.mesas set pos_x = (p_datos ->> 'pos_x')::numeric, pos_y = (p_datos ->> 'pos_y')::numeric,
        zona_id = coalesce((p_datos ->> 'zona_id')::uuid, zona_id) where id = p_mesa;
    when 'unir' then
      v_grupo := coalesce(m.union_grupo_id, gen_random_uuid());
      update laofi.mesas set union_grupo_id = v_grupo
      where id = p_mesa or id in (select (x)::uuid from jsonb_array_elements_text(coalesce(p_datos -> 'mesas', '[]')) x);
    when 'separar' then
      update laofi.mesas set union_grupo_id = null where union_grupo_id = m.union_grupo_id or id = p_mesa;
    when 'cambiar' then
      select * into v_destino from laofi.mesas where id = (p_datos ->> 'destino')::uuid for update;
      if v_destino.id is null or v_destino.ocupada or v_destino.bloqueada then
        raise exception 'La mesa de destino no está libre' using errcode = 'P0001';
      end if;
      update laofi.mesa_sesiones set mesa_id = v_destino.id where mesa_id = p_mesa and estado = 'ACTIVA';
      update laofi.pedidos set mesa_id = v_destino.id where mesa_id = p_mesa and m.entrada_at is not null and created_at >= m.entrada_at;
      update laofi.pagos set mesa_id = v_destino.id where mesa_id = p_mesa and m.entrada_at is not null and created_at >= m.entrada_at;
      update laofi.avisos set mesa_id = v_destino.id where mesa_id = p_mesa and atendido_at is null;
      update laofi.mesas set ocupada = true, comensales = m.comensales, entrada_at = m.entrada_at, nota = m.nota where id = v_destino.id;
      update laofi.mesas set ocupada = false, comensales = 0, entrada_at = null, por_limpiar = true, nota = null where id = p_mesa;
    when 'regenerar_qr' then
      perform laofi.exigir_rol('admin', 'encargado');
      update laofi.mesas set token = substr(replace(gen_random_uuid()::text, '-', ''), 1, 16) where id = p_mesa;
    when 'atender' then
      update laofi.avisos set atendido_at = now(), atendido_por = auth.uid()
      where mesa_id = p_mesa and atendido_at is null and (p_datos ->> 'tipo' is null or tipo = p_datos ->> 'tipo');
    else
      raise exception 'Acción no válida' using errcode = 'P0001';
  end case;
  return (select to_jsonb(x) from laofi.mesas x where x.id = coalesce(v_destino.id, p_mesa));
end;
$$;

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
        'pide_cuenta', exists (select 1 from laofi.avisos a where a.mesa_id = m.id and a.tipo = 'CUENTA' and a.atendido_at is null),
        'reserva', laofi.reserva_proxima(m.id),
        'camarero_id', coalesce(m.camarero_id, (select z.camarero_id from laofi.zonas z where z.id = m.zona_id)),
        'camarero', (select s.nombre from laofi.staff s
                     where s.user_id = coalesce(m.camarero_id, (select z.camarero_id from laofi.zonas z where z.id = m.zona_id))),
        'listos', coalesce((select sum(i.cantidad) from laofi.pedido_items i join laofi.pedidos p on p.id = i.pedido_id
                            where p.mesa_id = m.id and m.entrada_at is not null and p.created_at >= m.entrada_at
                              and p.estado <> 'CANCELLED' and i.estado = 'READY'), 0)
      ) order by m.numero) from laofi.mesas m where m.activa), '[]'::jsonb)
  )
  where laofi.mi_rol() in ('admin', 'encargado', 'camarero');
$$;

/** Sirve los platos listos de la ocupación actual de una mesa (READY → DELIVERED). Devuelve cuántos. */
create or replace function public.laofi_admin_servir_mesa(p_mesa uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_n integer;
  r_ped record;
  minimo integer;
  pasos text[] := array['RECEIVED', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED'];
begin
  perform laofi.exigir_rol('admin', 'encargado', 'camarero');
  with ped as (
    select pe.id from laofi.pedidos pe join laofi.mesas m on m.id = pe.mesa_id
    where m.id = p_mesa and m.entrada_at is not null and pe.created_at >= m.entrada_at and pe.estado <> 'CANCELLED'
  ), servidos as (
    update laofi.pedido_items i set estado = 'DELIVERED' from ped
    where i.pedido_id = ped.id and i.estado = 'READY'
    returning i.cantidad
  )
  select coalesce(sum(cantidad), 0) into v_n from servidos;

  -- Cada pedido queda en el progreso mínimo de sus líneas activas (como en cocina).
  for r_ped in select x.id, x.estado from laofi.pedidos x join laofi.mesas m on m.id = x.mesa_id
           where m.id = p_mesa and m.entrada_at is not null and x.created_at >= m.entrada_at and x.estado <> 'CANCELLED'
           for update of x loop
    select min(laofi.rango_estado(i.estado)) into minimo from laofi.pedido_items i where i.pedido_id = r_ped.id and i.estado <> 'CANCELLED';
    if minimo is not null then
      for k in laofi.rango_estado(r_ped.estado) + 1 .. minimo loop
        update laofi.pedidos set estado = pasos[k] where id = r_ped.id;
      end loop;
    end if;
  end loop;
  return v_n;
end;
$$;

/** Fin de servicio: marca como limpias todas las mesas libres pendientes de limpiar. */
create or replace function public.laofi_admin_limpiar_todas()
returns integer
language plpgsql
set search_path = ''
as $$
declare v_n integer;
begin
  perform laofi.exigir_rol('admin', 'encargado', 'camarero');
  update laofi.mesas set por_limpiar = false where por_limpiar and not ocupada;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

/** Servicio de sala por zona: ocupaciones, rotación (ocupaciones por mesa y día), tiempo medio, comensales e importe medio. */
create or replace function public.laofi_admin_ocupacion(p_desde date, p_hasta date)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with o as (
    select * from laofi.ocupaciones
    where (salida_at at time zone 'Europe/Madrid')::date between p_desde and p_hasta
  ), dias as (
    select greatest(1, (p_hasta - p_desde) + 1) as n
  )
  select jsonb_build_object(
    'desde_medicion', (select min(salida_at) from laofi.ocupaciones),
    'resumen', jsonb_build_object(
      'ocupaciones', (select count(*) from o),
      'comensales', coalesce((select sum(comensales) from o), 0),
      'minutos_medios', coalesce((select round(avg(extract(epoch from salida_at - entrada_at) / 60)) from o), 0),
      'importe_medio_centimos', coalesce((select round(avg(importe_centimos)) from o), 0)
    ),
    'por_zona', coalesce((
      select jsonb_agg(jsonb_build_object(
               'zona', z.nombre,
               'mesas', x.mesas,
               'ocupaciones', x.ocupaciones,
               'rotacion', case when x.mesas > 0 then round(x.ocupaciones::numeric / x.mesas / (select n from dias), 2) else 0 end,
               'minutos_medios', x.minutos,
               'comensales', x.comensales,
               'importe_medio_centimos', x.importe
             ) order by z.orden, z.nombre)
      from laofi.zonas z
      cross join lateral (
        select (select count(*) from laofi.mesas m where m.zona_id = z.id and m.activa) as mesas,
               count(o.id) as ocupaciones,
               coalesce(round(avg(extract(epoch from o.salida_at - o.entrada_at) / 60)), 0) as minutos,
               coalesce(sum(o.comensales), 0) as comensales,
               coalesce(round(avg(o.importe_centimos)), 0) as importe
        from o where o.zona_id = z.id
      ) x
      where z.activa
    ), '[]'::jsonb)
  )
  where laofi.mi_rol() in ('admin', 'encargado');
$$;

-- Permisos -------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array['public.laofi_admin_servir_mesa(uuid)', 'public.laofi_admin_limpiar_todas()',
                           'public.laofi_admin_ocupacion(date, date)', 'public.laofi_admin_mesa(uuid, text, jsonb)',
                           'public.laofi_admin_salon()'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end;
$$;
