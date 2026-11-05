-- Para llevar, solo el menú del día (05/11/2026). Carlos cambia los encargos de comida:
--  - Solo se puede encargar el menú del día, nada de la carta (ni el vino: los encargos de
--    vino siguen aparte, en /vinos, con su cava de regalo).
--  - Se encarga de 9:00 a 12:00 y se recoge ese mismo día de 13:00 a 15:00.
-- Todo cuelga del ajuste «recogida»:
--  - solo_menu_dia (bool): activa estas reglas. A false (o sin la clave) vuelve todo a como estaba.
--  - pedir_desde / pedir_hasta (HH:MI): cuándo se puede encargar (por defecto 09:00–12:00).
--  - desde / hasta: las horas de recogida (13:00–15:00).
-- Cambios:
--  - laofi.recogida_solo_menu() y laofi.recogida_pedible_ahora().
--  - laofi_get_config_pedidos: fuera de la hora de encargar no hay franjas; con solo menú,
--    «proximas» es solo hoy. Devuelve también solo_menu_dia, pedir_desde, pedir_hasta,
--    recogida_desde y recogida_hasta.
--  - laofi_crear_pedido (para recoger y de grupo): solo líneas de menú del día, solo dentro
--    de la hora de encargar y solo para recoger hoy.
--  - laofi_crear_grupo: lo mismo, y el grupo se cierra como tarde a la hora de dejar de encargar.

update laofi.ajustes
set valor = valor || '{"desde": "13:00", "hasta": "15:00", "solo_menu_dia": true, "pedir_desde": "09:00", "pedir_hasta": "12:00"}'::jsonb
where clave = 'recogida';

create or replace function laofi.recogida_solo_menu()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select (valor ->> 'solo_menu_dia')::boolean from laofi.ajustes where clave = 'recogida'), false);
$$;

/** ¿Se puede encargar ahora? Sin «solo menú», siempre (manda la franja). */
create or replace function laofi.recogida_pedible_ahora()
returns boolean
language sql
stable
set search_path = ''
as $$
  select not laofi.recogida_solo_menu()
      or ((now() at time zone 'Europe/Madrid')::time >= coalesce((a.valor ->> 'pedir_desde')::time, '09:00')
          and (now() at time zone 'Europe/Madrid')::time < coalesce((a.valor ->> 'pedir_hasta')::time, '12:00'))
  from (select 1) x left join laofi.ajustes a on a.clave = 'recogida';
$$;

revoke all on function laofi.recogida_solo_menu(), laofi.recogida_pedible_ahora() from public, anon;
grant execute on function laofi.recogida_solo_menu(), laofi.recogida_pedible_ahora() to authenticated, service_role;

create or replace function public.laofi_get_config_pedidos(p_site_key uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  select jsonb_build_object(
    'pagos', (select valor from laofi.ajustes where clave = 'pagos'),
    'menu_hasta', (select to_char(f.hasta, 'HH24:MI') from laofi.menu_franja() f),
    'solo_menu_dia', laofi.recogida_solo_menu(),
    'pedir_desde', (select coalesce(valor ->> 'pedir_desde', '09:00') from laofi.ajustes where clave = 'recogida'),
    'pedir_hasta', (select coalesce(valor ->> 'pedir_hasta', '12:00') from laofi.ajustes where clave = 'recogida'),
    'recogida_desde', (select valor ->> 'desde' from laofi.ajustes where clave = 'recogida'),
    'recogida_hasta', (select valor ->> 'hasta' from laofi.ajustes where clave = 'recogida'),
    'recogida_activa', laofi.recogida_pedible_ahora() and exists (select 1 from laofi.franjas_recogida_hoy()),
    'franjas', case when laofi.recogida_pedible_ahora() then
                 coalesce((select jsonb_agg(jsonb_build_object('hora', f.hora, 'libres', f.libres) order by f.hora)
                           from laofi.franjas_recogida_hoy() f), '[]'::jsonb)
               else '[]'::jsonb end,
    'proximas', case when laofi.recogida_pedible_ahora() then
                  coalesce((select jsonb_agg(jsonb_build_object('hora', f.hora, 'libres', f.libres) order by f.hora)
                            from generate_series(0, case when laofi.recogida_solo_menu() then 0 else 60 end) d,
                                 laofi.franjas_recogida(((now() at time zone 'Europe/Madrid')::date + d)::date) f), '[]'::jsonb)
                else '[]'::jsonb end
  )
  where laofi.site_key_valida(p_site_key);
$$;

create or replace function public.laofi_crear_grupo(p_site_key uuid, p_nombre text, p_organizador text, p_recogida_en timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public, laofi
as $$
declare
  v_libres integer;
  v_antelacion integer;
  v_cierra timestamptz;
  v_cfg jsonb;
  v laofi.grupos_pedido;
begin
  if not laofi.site_key_valida(p_site_key) then raise exception 'site_key inválida' using errcode = 'P0001'; end if;
  select valor into v_cfg from laofi.ajustes where clave = 'recogida';
  if not laofi.recogida_pedible_ahora() then
    raise exception 'Los encargos de comida se hacen de % a %', coalesce(v_cfg ->> 'pedir_desde', '09:00'), coalesce(v_cfg ->> 'pedir_hasta', '12:00') using errcode = 'P0001';
  end if;
  select f.libres into v_libres from laofi.franjas_recogida_hoy() f where f.hora = p_recogida_en;
  if v_libres is null or v_libres < 1 then raise exception 'Franja de recogida no disponible' using errcode = 'P0001'; end if;
  v_antelacion := coalesce((v_cfg ->> 'antelacion_min')::int, 0);
  v_cierra := p_recogida_en - make_interval(mins => v_antelacion);
  -- Solo menú: cada uno añade lo suyo hasta la hora de dejar de encargar.
  if laofi.recogida_solo_menu() then
    v_cierra := least(v_cierra, (((now() at time zone 'Europe/Madrid')::date + coalesce((v_cfg ->> 'pedir_hasta')::time, '12:00')) at time zone 'Europe/Madrid'));
  end if;
  insert into laofi.grupos_pedido (nombre, organizador, recogida_en, cierra_en)
  values (btrim(p_nombre), btrim(p_organizador), p_recogida_en, v_cierra)
  returning * into v;
  return jsonb_build_object('token', v.token, 'recogida_en', v.recogida_en, 'cierra_en', v.cierra_en);
end;
$$;

-- laofi_crear_pedido: se añaden las reglas al principio de la rama «para recoger». Se reescribe
-- la definición que hay en la base (20261104230000 + 20261105100000); el resto queda igual.
do $mig$
declare
  def text;
  ancla constant text := E'  else\n    if p_pedido ? ''grupo_token'' then';
  reglas constant text := E'  else\n'
    '    -- Solo menú del día (20261105200000): de pedir_desde a pedir_hasta, para recoger hoy.\n'
    '    if laofi.recogida_solo_menu() then\n'
    '      if not laofi.recogida_pedible_ahora() then\n'
    '        select valor into v_pagos from laofi.ajustes where clave = ''recogida'';\n'
    '        raise exception ''Los encargos de comida se hacen de % a %'', coalesce(v_pagos ->> ''pedir_desde'', ''09:00''), coalesce(v_pagos ->> ''pedir_hasta'', ''12:00'') using errcode = ''P0001'';\n'
    '      end if;\n'
    '      if exists (select 1 from jsonb_array_elements(p_pedido -> ''items'') x where not coalesce((x ->> ''menu_dia'')::boolean, false)) then\n'
    '        raise exception ''Para llevar solo se puede encargar el menú del día'' using errcode = ''P0001'';\n'
    '      end if;\n'
    '      if not p_pedido ? ''grupo_token'' and ((p_pedido ->> ''recogida_en'')::timestamptz at time zone ''Europe/Madrid'')::date is distinct from v_hoy then\n'
    '        raise exception ''El menú del día solo se puede pedir para recoger hoy'' using errcode = ''P0001'';\n'
    '      end if;\n'
    '    end if;\n'
    '    if p_pedido ? ''grupo_token'' then';
begin
  select pg_get_functiondef('public.laofi_crear_pedido(uuid, jsonb)'::regprocedure) into def;
  if position(ancla in def) = 0 then raise exception 'laofi_crear_pedido: no está la rama de recogida'; end if;
  if position('recogida_solo_menu' in def) > 0 then return; end if;
  execute replace(def, ancla, reglas);
end;
$mig$;
