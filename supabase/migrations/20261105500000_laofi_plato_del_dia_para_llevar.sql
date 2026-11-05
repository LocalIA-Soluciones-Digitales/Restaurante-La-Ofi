-- Para llevar, el plato del día en vez del menú del día (05/11/2026). Carlos: para llevar solo
-- se elige UN plato del menú de hoy, sin bebida, pan ni postre, a 7,90 €.
--  - Ajuste «recogida».precio_plato_centimos (por defecto 790) y laofi.precio_plato_dia().
--  - laofi_get_config_pedidos: devuelve precio_plato_centimos para la web.
--  - laofi_crear_pedido: la línea menu_dia lleva un solo plato, se llama «Plato del día» y se
--    cobra al precio del plato del día (no al del menú). Resto igual que en 20261105200000.

update laofi.ajustes set valor = valor || '{"precio_plato_centimos": 790}'::jsonb
where clave = 'recogida' and not (valor ? 'precio_plato_centimos');

create or replace function laofi.precio_plato_dia()
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce((select (a.valor ->> 'precio_plato_centimos')::integer from laofi.ajustes a where a.clave = 'recogida'), 790);
$$;

revoke all on function laofi.precio_plato_dia() from public, anon;
grant execute on function laofi.precio_plato_dia() to authenticated, service_role;

create or replace function public.laofi_get_config_pedidos(p_site_key uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  select jsonb_build_object(
    'pagos', (select valor from laofi.ajustes where clave = 'pagos'),
    'precio_plato_centimos', laofi.precio_plato_dia(),
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

create or replace function public.laofi_crear_pedido(p_site_key uuid, p_pedido jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, laofi
as $$
declare
  v_precio_plato integer;
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
        raise exception 'El plato del día solo se puede pedir para recoger hoy' using errcode = 'P0001';
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
    -- Plato del día (20261105500000): para llevar, un solo plato del menú de hoy al precio
    -- del plato del día (ajuste «recogida».precio_plato_centimos, 7,90 €), sin bebida ni
    -- postre. Solo el de hoy, mientras está publicado (8:00–16:00), y para recoger como
    -- mucho a la hora en que termina.
    if coalesce((v_item ->> 'menu_dia')::boolean, false) then
      v_cantidad := coalesce((v_item ->> 'cantidad')::integer, 1);
      if v_cantidad < 1 or v_cantidad > 50 then raise exception 'Cantidad no válida' using errcode = 'P0001'; end if;
      select * into v_franja from laofi.menu_franja();
      if not laofi.menu_visible_ahora() then
        raise exception 'El plato del día se puede pedir de % a %', to_char(v_franja.desde, 'HH24:MI'), to_char(v_franja.hasta, 'HH24:MI') using errcode = 'P0001';
      end if;
      select * into v_menu from laofi.menus_dia m where m.fecha = (now() at time zone 'Europe/Madrid')::date and m.disponible;
      if v_menu.id is null then raise exception 'Hoy no hay menú del día' using errcode = 'P0001'; end if;
      if v_recogida is not null and (v_recogida at time zone 'Europe/Madrid')::date <> v_hoy then
        raise exception 'El plato del día solo se puede pedir para recoger hoy' using errcode = 'P0001';
      end if;
      if v_recogida is not null and (v_recogida at time zone 'Europe/Madrid')::time > v_franja.hasta then
        raise exception 'El plato del día se recoge hasta las %', to_char(v_franja.hasta, 'HH24:MI') using errcode = 'P0001';
      end if;
      if jsonb_typeof(v_item -> 'platos') is distinct from 'array' or jsonb_array_length(v_item -> 'platos') <> 1 then
        raise exception 'Elige un plato del día' using errcode = 'P0001';
      end if;
      select jsonb_agg(jsonb_build_object('nombre', pl.nombre, 'precio_extra_centimos', 0)
                       order by array_position(array['plato', 'primero', 'segundo', 'postre'], pl.tipo), pl.orden),
             count(*), count(distinct pl.tipo)
        into v_platos, v_n, v_ntipos
      from laofi.menu_dia_platos pl
      where pl.menu_id = v_menu.id and pl.id::text in (select jsonb_array_elements_text(v_item -> 'platos'));
      if v_n <> 1 then
        raise exception 'Ese plato ya no está en el menú de hoy' using errcode = 'P0001';
      end if;
      v_precio_plato := laofi.precio_plato_dia();
      insert into laofi.pedido_items (pedido_id, producto_id, nombre, cantidad, precio_unitario_centimos, modificadores, notas, estacion, iva_pct)
      values (v_pedido_id, null, 'Plato del día', v_cantidad, v_precio_plato,
              jsonb_build_array(jsonb_build_object('modificador', 'Plato', 'opciones', v_platos)),
              nullif(left(btrim(v_item ->> 'notas'), 140), ''), 'cocina', 10);
      v_subtotal := v_subtotal + v_precio_plato * v_cantidad;
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
