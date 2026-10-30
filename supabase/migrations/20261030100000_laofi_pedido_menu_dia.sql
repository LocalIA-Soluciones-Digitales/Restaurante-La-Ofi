-- Menú del día para llevar (29/10/2026). «Pedir para recoger» (/pedir) es la página
-- para llevar: carta y, ahora, también el menú del día, en el mismo pedido.
--  - laofi_crear_pedido acepta líneas {menu_dia: true, platos: [id, …], cantidad}: un
--    plato de cada grupo del menú de hoy, al precio del menú; solo mientras está
--    publicado (8:00–16:00) y para recoger como mucho a esa hora. En cocina y en el
--    ticket sale «Menú del día» con sus platos (como opciones de la línea).
--  - laofi_get_config_pedidos devuelve también menu_hasta.

create or replace function public.laofi_crear_pedido(p_site_key uuid, p_pedido jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, laofi
as $$
declare
  v_tipo text := p_pedido ->> 'tipo';
  v_pago text := coalesce(p_pedido ->> 'payment_method', 'LOCAL');
  v_pagos jsonb;
  v_mesa laofi.mesas;
  v_sesion laofi.mesa_sesiones;
  v_participante uuid := nullif(p_pedido ->> 'participante_id', '')::uuid;
  v_grupo laofi.grupos_pedido;
  v_recogida timestamptz;
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
    if p_pedido ? 'grupo_token' then
      select * into v_grupo from laofi.grupos_pedido where token = p_pedido ->> 'grupo_token' for update;
      if v_grupo.id is null or v_grupo.estado <> 'ABIERTO' or now() >= v_grupo.cierra_en then
        raise exception 'El pedido de grupo ya está cerrado' using errcode = 'P0001';
      end if;
      v_recogida := v_grupo.recogida_en;
    else
      v_recogida := (p_pedido ->> 'recogida_en')::timestamptz;
      perform pg_advisory_xact_lock(hashtext('laofi.recogida'));
      if not exists (select 1 from laofi.franjas_recogida_hoy() f where f.hora = v_recogida and f.libres > 0) then
        raise exception 'Franja de recogida no disponible' using errcode = 'P0001';
      end if;
    end if;
    if nullif(btrim(p_pedido ->> 'nombre'), '') is null then
      raise exception 'Falta el nombre para la recogida' using errcode = 'P0001';
    end if;
  end if;

  v_numero := laofi.siguiente_numero_dia();
  insert into laofi.pedidos (numero_dia, tipo, mesa_id, sesion_id, participante_id, grupo_id, nombre_cliente, telefono,
                             recogida_en, payment_method, notas)
  values (v_numero, v_tipo, v_mesa.id, v_sesion.id, v_participante, v_grupo.id,
          nullif(btrim(p_pedido ->> 'nombre'), ''), nullif(regexp_replace(coalesce(p_pedido ->> 'telefono', ''), '[^0-9+ ]', '', 'g'), ''),
          v_recogida, v_pago, nullif(btrim(p_pedido ->> 'notas'), ''))
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
    'recogida_activa', exists (select 1 from laofi.franjas_recogida_hoy()),
    'franjas', coalesce((select jsonb_agg(jsonb_build_object('hora', f.hora, 'libres', f.libres) order by f.hora)
                         from laofi.franjas_recogida_hoy() f), '[]'::jsonb)
  )
  where laofi.site_key_valida(p_site_key);
$$;
