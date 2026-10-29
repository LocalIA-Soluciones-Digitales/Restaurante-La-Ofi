-- Pedidos del menú del día (29/10/2026): La Ofi vende para recoger el plato del
-- día además de la carta. Una línea con «menu_plato_id» es una opción del menú de
-- HOY (publicado y con precio) y se cobra al precio del menú. El resto de
-- laofi_crear_pedido queda igual que en 20261002110000_laofi_salon_pedidos.

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
  v_menu record;
  v_nombre text;
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
    v_cantidad := coalesce((v_item ->> 'cantidad')::integer, 1);
    if v_cantidad < 1 or v_cantidad > 50 then raise exception 'Cantidad no válida' using errcode = 'P0001'; end if;

    if v_item ? 'menu_plato_id' then
      -- Una opción del menú del día de HOY, publicado y con precio. Se cobra el
      -- precio del menú guardado, nunca el que mande el navegador.
      select mp.nombre, m.precio_centimos into v_menu
      from laofi.menu_dia_platos mp
      join laofi.menus_dia m on m.id = mp.menu_id
      where mp.id = (v_item ->> 'menu_plato_id')::uuid
        and m.fecha = (now() at time zone 'Europe/Madrid')::date
        and m.disponible;
      if not found then
        raise exception 'AGOTADO:%', v_item ->> 'menu_plato_id' using errcode = 'P0001';
      end if;
      if v_menu.precio_centimos is null then
        raise exception 'El menú del día no se puede pedir online (precio en el local)' using errcode = 'P0001';
      end if;
      v_nombre := 'Menú del día · ' || v_menu.nombre;

      insert into laofi.pedido_items (pedido_id, producto_id, nombre, cantidad, precio_unitario_centimos, modificadores, notas, estacion, iva_pct)
      values (v_pedido_id, null, v_nombre, v_cantidad, v_menu.precio_centimos, '[]'::jsonb,
              nullif(left(btrim(v_item ->> 'notas'), 140), ''), 'cocina', 10)
      returning id into v_item_id;

      v_linea_total := v_menu.precio_centimos * v_cantidad;
    else
      select * into v_producto from laofi.productos where id = (v_item ->> 'producto_id')::uuid and disponible;
      if v_producto.id is null then
        raise exception 'AGOTADO:%', coalesce(v_item ->> 'producto_id', '') using errcode = 'P0001';
      end if;
      if v_producto.precio_centimos is null then
        raise exception '% no se puede pedir online (precio en el local)', v_producto.nombre using errcode = 'P0001';
      end if;
      select coalesce(array_agg(x::uuid), '{}') into v_opciones from jsonb_array_elements_text(coalesce(v_item -> 'opciones', '[]')) x;
      select * into v_linea from laofi.linea_validada(v_producto, v_opciones);
      v_nombre := v_producto.nombre;

      insert into laofi.pedido_items (pedido_id, producto_id, nombre, cantidad, precio_unitario_centimos, modificadores, notas, estacion, iva_pct)
      values (v_pedido_id, v_producto.id, v_producto.nombre, v_cantidad, v_linea.precio, v_linea.modificadores,
              nullif(left(btrim(v_item ->> 'notas'), 140), ''), v_producto.estacion, v_producto.iva_pct)
      returning id into v_item_id;

      v_linea_total := v_linea.precio * v_cantidad;
    end if;
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
          raise exception 'PRECIO_CAMBIADO:el reparto de % no cuadra con su precio', v_nombre using errcode = 'P0001';
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
