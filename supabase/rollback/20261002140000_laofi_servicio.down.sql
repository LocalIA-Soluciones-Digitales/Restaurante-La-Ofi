-- Reversión de 20261002140000_laofi_servicio. Borra el historial de ocupaciones
-- y las asignaciones de camarero. Restaura public.laofi_admin_mesa (de
-- 20261002120000) y public.laofi_admin_salon (de 20261002130000) literalmente.
-- Ejecutar ANTES que las reversiones anteriores.
drop function if exists public.laofi_admin_servir_mesa(uuid);
drop function if exists public.laofi_admin_limpiar_todas();
drop function if exists public.laofi_admin_ocupacion(date, date);

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
        'reserva', laofi.reserva_proxima(m.id)
      ) order by m.numero) from laofi.mesas m where m.activa), '[]'::jsonb)
  )
  where laofi.mi_rol() in ('admin', 'encargado', 'camarero');
$$;

drop table if exists laofi.ocupaciones;
alter table laofi.mesas drop column if exists camarero_id;
alter table laofi.zonas drop column if exists camarero_id;
