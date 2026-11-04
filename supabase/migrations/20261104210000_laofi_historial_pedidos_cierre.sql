-- Historial de pedidos (04/11/2026): un pedido encargado para otro día que se entrega o
-- se anula antes no salía en ninguna fecha hasta llegar su día de servicio (el historial
-- solo llega hasta hoy). Ahora entra si su día de servicio O el día en que se cerró
-- (updated_at, en hora de Madrid) caen dentro de las fechas elegidas.

create or replace function public.laofi_admin_pedidos_historial(p_desde date, p_hasta date, p_buscar text default null)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_b text := nullif(btrim(coalesce(p_buscar, '')), '');
  v_dig text := regexp_replace(coalesce(p_buscar, ''), '\D', '', 'g');
begin
  perform laofi.exigir_rol('admin', 'encargado', 'camarero');
  if p_desde is null or p_hasta is null or p_hasta < p_desde then raise exception 'Fechas no válidas' using errcode = 'P0001'; end if;
  if p_hasta - p_desde > 366 then raise exception 'Como mucho un año cada vez' using errcode = 'P0001'; end if;
  return coalesce((
    select jsonb_agg(laofi.pedido_kds_json(p) order by p.fecha_servicio desc, coalesce(p.recogida_en, p.created_at) desc)
    from (
      select * from laofi.pedidos p
      where p.tipo = 'RECOGIDA'
        and p.estado in ('DELIVERED', 'CANCELLED')
        and (p.fecha_servicio between p_desde and p_hasta
             or (p.updated_at at time zone 'Europe/Madrid')::date between p_desde and p_hasta)
        and (v_b is null
             or p.nombre_cliente ilike '%' || v_b || '%'
             or (length(v_dig) >= 3 and regexp_replace(coalesce(p.telefono, ''), '\D', '', 'g') like '%' || v_dig || '%')
             or p.numero_dia::text = ltrim(v_b, '#'))
      order by p.fecha_servicio desc, coalesce(p.recogida_en, p.created_at) desc
      limit 1000
    ) p
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.laofi_admin_pedidos_historial(date, date, text) from public, anon;
grant execute on function public.laofi_admin_pedidos_historial(date, date, text) to authenticated, service_role;
