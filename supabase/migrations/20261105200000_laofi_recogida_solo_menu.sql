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

-- laofi_crear_pedido: definición completa (la de 20261104230000 con el plazo de 60 días de
-- 20261105100000) más las reglas de «solo menú» al principio de la rama «para recoger».
-- Se reescribe entera para no depender de cómo esté escrita la anterior en la base.
alter table laofi.pedidos add column if not exists email text;

create or replace function public.laofi_crear_pedido(p_site_key uuid, p_pedido jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, laofi
as $$
declare
  v_tipo text := p_pedido ->> 'tipo';
  v_email text := nullif(lower(btrim(p_pedido ->> 'email')), '');
  v_pago text := coalesce(p_pedido ->> 'payment_method', 'LOCAL');
  v_pagos jsonb;
  v_cfg jsonb;
  v_mesa laofi.mesas;
  v_sesion laofi.mesa_sesiones;
  v_participante uuid := nullif(p_pedido ->> 'participante_id', '')::uuid;
  v_grupo laofi.grupos_pedido;
  v_recogida timestamptz;
  v_fecha date;
  v_hoy date := (now() at time zone 'Europe/Madrid')::date;
  v_pedido_id uuid;
  v_numero integer;
  v_item jsonb;
  v_reparto jsonb;
  v_producto laofi.productos;
  v_linea record;
  v_cantidad integer;
  v_item_id uuid;
  v_subtotal integer := 0;
  v_linea_total integer;
  v_suma integer;
  v_opciones uuid[];
  v_menu laofi.menus_dia;
  v_franja record;
  v_platos jsonb;
  v_n integer;
  v_ntipos integer;
begin
  if not laofi.site_key_valida(p_site_key) then raise exception 'site_key inválida' using errcode = 'P0001'; end if;
  if v_tipo not in ('MESA', 'RECOGIDA') then raise exception 'Tipo de pedido no válido' using errcode = 'P0001'; end if;
  if v_pago not in ('ONLINE', 'LOCAL') then raise exception 'Método de pago no válido' using errcode = 'P0001'; end if;
  select valor into v_pagos from laofi.ajustes where clave = 'pagos';
  if v_pago = 'ONLINE' and not coalesce((v_pagos ->> 'online')::boolean, false) then
    raise exception 'El pago online no está activo' using errcode = 'P0001';
  end if;
  if v_pago = 'LOCAL' and not coalesce((v_pagos ->> 'en_local')::boolean, true) then
    raise exception 'El pago en el local no está activo' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_pedido -> 'items') is distinct from 'array' or jsonb_array_length(p_pedido -> 'items') = 0 then
    raise exception 'El pedido no tiene productos' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_pedido -> 'items') > 60 then raise exception 'Demasiadas líneas' using errcode = 'P0001'; end if;

  if v_tipo = 'MESA' then
    select * into v_mesa from laofi.mesas where token = p_pedido ->> 'mesa_token' and activa;
    if v_mesa.id is null then raise exception 'Mesa no válida' using errcode = 'P0001'; end if;
    if p_pedido ? 'sesion_id' then
      select * into v_sesion from laofi.mesa_sesiones
      where id = (p_pedido ->> 'sesion_id')::uuid and mesa_id = v_mesa.id and estado = 'ACTIVA';
      if v_sesion.id is null then raise exception 'Sesión de mesa no válida o cerrada' using errcode = 'P0001'; end if;
      if v_participante is not null and not exists (
        select 1 from laofi.sesion_participantes where id = v_participante and sesion_id = v_sesion.id) then
        raise exception 'Comensal no válido para esta mesa' using errcode = 'P0001';
      end if;
    end if;
  else
    -- Solo menú del día (20261105200000): de pedir_desde a pedir_hasta, para recoger hoy.
    if laofi.recogida_solo_menu() then
      if not laofi.recogida_pedible_ahora() then
        select valor into v_cfg from laofi.ajustes where clave = 'recogida';
        raise exception 'Los encargos de comida se hacen de % a %', coalesce(v_cfg ->> 'pedir_desde', '09:00'), coalesce(v_cfg ->> 'pedir_hasta', '12:00') using errcode = 'P0001';
      end if;
      if exists (select 1 from jsonb_array_elements(p_pedido -> 'items') x where not coalesce((x ->> 'menu_dia')::boolean, false)) then
        raise exception 'Para llevar solo se puede encargar el menú del día' using errcode = 'P0001';
      end if;
      if not p_pedido ? 'grupo_token' and ((p_pedido ->> 'recogida_en')::timestamptz at time zone 'Europe/Madrid')::date is distinct from v_hoy then
        raise exception 'El menú del día solo se puede pedir para recoger hoy' using errcode = 'P0001';
      end if;
    end if;
    if p_pedido ? 'grupo_token' then
      select * into v_grupo from laofi.grupos_pedido where token = p_pedido ->> 'grupo_token' for update;
      if v_grupo.id is null or v_grupo.estado <> 'ABIERTO' or now() >= v_grupo.cierra_en then
        raise exception 'El pedido de grupo ya está cerrado' using errcode = 'P0001';
      end if;
      v_recogida := v_grupo.recogida_en;
    else
      v_recogida := (p_pedido ->> 'recogida_en')::timestamptz;
      perform pg_advisory_xact_lock(hashtext('laofi.recogida'));
      v_fecha := (v_recogida at time zone 'Europe/Madrid')::date;
      -- Hoy o, si se encarga antes, uno de los próximos 60 días (laofi.franjas_recogida).
      if v_fecha is null or v_fecha < v_hoy or v_fecha > v_hoy + 60
         or not exists (select 1 from laofi.franjas_recogida(v_fecha) f where f.hora = v_recogida and f.libres > 0) then
        raise exception 'Franja de recogida no disponible' using errcode = 'P0001';
      end if;
    end if;
    if nullif(btrim(p_pedido ->> 'nombre'), '') is null then
      raise exception 'Falta el nombre para la recogida' using errcode = 'P0001';
    end if;
    -- Para recoger (no en los pedidos de grupo): teléfono obligatorio, por si hay que avisar.
    if not p_pedido ? 'grupo_token'
       and length(regexp_replace(coalesce(p_pedido ->> 'telefono', ''), '[^0-9]', '', 'g')) < 9 then
      raise exception 'Falta el teléfono para la recogida' using errcode = 'P0001';
    end if;
  end if;

  if v_email is not null and (length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'El email no es válido' using errcode = 'P0001';
  end if;

  -- Un encargo para otro día cuenta en ese día: su número, la cocina y los informes.
  v_numero := laofi.siguiente_numero_dia(coalesce(v_fecha, v_hoy));
  insert into laofi.pedidos (numero_dia, tipo, mesa_id, sesion_id, participante_id, grupo_id, nombre_cliente, telefono, email,
                             recogida_en, payment_method, notas, fecha_servicio)
  values (v_numero, v_tipo, v_mesa.id, v_sesion.id, v_participante, v_grupo.id,
          nullif(btrim(p_pedido ->> 'nombre'), ''), nullif(regexp_replace(coalesce(p_pedido ->> 'telefono', ''), '[^0-9+ ]', '', 'g'), ''), v_email,
          v_recogida, v_pago, nullif(btrim(p_pedido ->> 'notas'), ''), coalesce(v_fecha, v_hoy))
  returning id into v_pedido_id;

  for v_item in select * from jsonb_array_elements(p_pedido -> 'items') loop
    -- Menú del día: un plato de cada grupo (primero, segundo, postre o «a elegir»), al
    -- precio del menú. Solo el de hoy, mientras está publicado (8:00–16:00), y para
    -- recoger como mucho a la hora en que termina.
    if coalesce((v_item ->> 'menu_dia')::boolean, false) then
      v_cantidad := coalesce((v_item ->> 'cantidad')::integer, 1);
      if v_cantidad < 1 or v_cantidad > 50 then raise exception 'Cantidad no válida' using errcode = 'P0001'; end if;
      select * into v_franja from laofi.menu_franja();
      if not laofi.menu_visible_ahora() then
        raise exception 'El menú del día se puede pedir de % a %', to_char(v_franja.desde, 'HH24:MI'), to_char(v_franja.hasta, 'HH24:MI') using errcode = 'P0001';
      end if;
      select * into v_menu from laofi.menus_dia m where m.fecha = (now() at time zone 'Europe/Madrid')::date and m.disponible;
      if v_menu.id is null then raise exception 'Hoy no hay menú del día' using errcode = 'P0001'; end if;
      if v_menu.precio_centimos is null then raise exception 'El menú del día de hoy se pide en el local' using errcode = 'P0001'; end if;
      if v_recogida is not null and (v_recogida at time zone 'Europe/Madrid')::date <> v_hoy then
        raise exception 'El menú del día solo se puede pedir para recoger hoy' using errcode = 'P0001';
      end if;
      if v_recogida is not null and (v_recogida at time zone 'Europe/Madrid')::time > v_franja.hasta then
        raise exception 'El menú del día se recoge hasta las %', to_char(v_franja.hasta, 'HH24:MI') using errcode = 'P0001';
      end if;
      if jsonb_typeof(v_item -> 'platos') is distinct from 'array' or jsonb_array_length(v_item -> 'platos') = 0 then
        raise exception 'Elige los platos del menú' using errcode = 'P0001';
      end if;
      select jsonb_agg(jsonb_build_object('nombre', pl.nombre, 'precio_extra_centimos', 0)
                       order by array_position(array['plato', 'primero', 'segundo', 'postre'], pl.tipo), pl.orden),
             count(*), count(distinct pl.tipo)
        into v_platos, v_n, v_ntipos
      from laofi.menu_dia_platos pl
      where pl.menu_id = v_menu.id and pl.id::text in (select jsonb_array_elements_text(v_item -> 'platos'));
      if v_n <> jsonb_array_length(v_item -> 'platos') or v_n <> v_ntipos then
        raise exception 'Elige un plato de cada grupo del menú' using errcode = 'P0001';
      end if;
      insert into laofi.pedido_items (pedido_id, producto_id, nombre, cantidad, precio_unitario_centimos, modificadores, notas, estacion, iva_pct)
      values (v_pedido_id, null, 'Menú del día', v_cantidad, v_menu.precio_centimos,
              jsonb_build_array(jsonb_build_object('modificador', 'Platos', 'opciones', v_platos)),
              nullif(left(btrim(v_item ->> 'notas'), 140), ''), 'cocina', 10);
      v_subtotal := v_subtotal + v_menu.precio_centimos * v_cantidad;
      continue;
    end if;

    select * into v_producto from laofi.productos where id = (v_item ->> 'producto_id')::uuid and disponible;
    if v_producto.id is null then
      raise exception 'AGOTADO:%', coalesce(v_item ->> 'producto_id', '') using errcode = 'P0001';
    end if;
    if v_producto.precio_centimos is null then
      raise exception '% no se puede pedir online (precio en el local)', v_producto.nombre using errcode = 'P0001';
    end if;
    v_cantidad := coalesce((v_item ->> 'cantidad')::integer, 1);
    if v_cantidad < 1 or v_cantidad > 50 then raise exception 'Cantidad no válida' using errcode = 'P0001'; end if;
    select coalesce(array_agg(x::uuid), '{}') into v_opciones from jsonb_array_elements_text(coalesce(v_item -> 'opciones', '[]')) x;
    select * into v_linea from laofi.linea_validada(v_producto, v_opciones);

    insert into laofi.pedido_items (pedido_id, producto_id, nombre, cantidad, precio_unitario_centimos, modificadores, notas, estacion, iva_pct)
    values (v_pedido_id, v_producto.id, v_producto.nombre, v_cantidad, v_linea.precio, v_linea.modificadores,
            nullif(left(btrim(v_item ->> 'notas'), 140), ''), v_producto.estacion, v_producto.iva_pct)
    returning id into v_item_id;

    v_linea_total := v_linea.precio * v_cantidad;
    v_subtotal := v_subtotal + v_linea_total;

    -- Reparto entre comensales (modo "cada uno lo suyo"): debe cuadrar al céntimo.
    if v_sesion.id is not null and v_sesion.modo = 'SEPARADO' then
      if jsonb_typeof(v_item -> 'reparto') = 'array' and jsonb_array_length(v_item -> 'reparto') > 0 then
        v_suma := 0;
        for v_reparto in select * from jsonb_array_elements(v_item -> 'reparto') loop
          if not exists (select 1 from laofi.sesion_participantes
                         where id = (v_reparto ->> 'participante_id')::uuid and sesion_id = v_sesion.id) then
            raise exception 'Reparto con un comensal de otra mesa' using errcode = 'P0001';
          end if;
          insert into laofi.pedido_item_repartos (pedido_item_id, participante_id, importe_centimos)
          values (v_item_id, (v_reparto ->> 'participante_id')::uuid, (v_reparto ->> 'importe_centimos')::integer);
          v_suma := v_suma + (v_reparto ->> 'importe_centimos')::integer;
        end loop;
        if v_suma <> v_linea_total then
          raise exception 'PRECIO_CAMBIADO:el reparto de % no cuadra con su precio', v_producto.nombre using errcode = 'P0001';
        end if;
      elsif v_participante is not null then
        insert into laofi.pedido_item_repartos (pedido_item_id, participante_id, importe_centimos)
        values (v_item_id, v_participante, v_linea_total);
      end if;
    end if;
  end loop;

  if p_pedido ? 'total_esperado_centimos' and (p_pedido ->> 'total_esperado_centimos')::integer <> v_subtotal then
    raise exception 'PRECIO_CAMBIADO:%', v_subtotal using errcode = 'P0001';
  end if;

  update laofi.pedidos set subtotal_centimos = v_subtotal, total_centimos = v_subtotal where id = v_pedido_id;
  return jsonb_build_object('id', v_pedido_id, 'numero_dia', v_numero, 'total_centimos', v_subtotal);
end;
$$;
