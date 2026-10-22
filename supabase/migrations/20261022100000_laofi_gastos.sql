-- Gastos: albaranes, facturas y tickets de proveedores, leídos con OCR en el
-- propio navegador (PaddleOCR, gratis y sin mandar la foto a nadie) y revisados
-- a mano antes de guardarlos. Lo que se corrige al revisar se recuerda en
-- laofi.gastos_proveedores: así el lector va aprendiendo (CIF → proveedor,
-- nombres mal leídos → proveedor, proveedor → categoría).

-- Misma normalización que normalizarGasto() en src/lib/gastos/ocr.ts.
create or replace function laofi.norm_gasto(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(lower(translate(coalesce(p, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')), '\s+', ' ', 'g'));
$$;

create table laofi.gastos_proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(btrim(nombre)) > 0),
  cif text unique check (cif is null or cif ~ '^[A-Z0-9]{8,10}$'),
  -- Cómo lo ha leído el OCR otras veces (normalizado): sirve para reconocerlo
  -- aunque el nombre salga mal o venga en un logo.
  pistas text[] not null default '{}',
  categoria text not null default 'otros'
    check (categoria in ('comida', 'bebida', 'limpieza', 'suministros', 'alquiler', 'personal', 'servicios', 'mantenimiento', 'impuestos', 'otros')),
  veces integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index gastos_proveedores_nombre_idx on laofi.gastos_proveedores (laofi.norm_gasto(nombre));

create table laofi.gastos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default (now() at time zone 'Europe/Madrid')::date,
  tipo text not null default 'factura' check (tipo in ('albaran', 'factura', 'ticket', 'otro')),
  proveedor_id uuid references laofi.gastos_proveedores(id) on delete set null,
  proveedor text not null check (length(btrim(proveedor)) > 0),
  cif text check (cif is null or cif ~ '^[A-Z0-9]{8,10}$'),
  numero text,
  categoria text not null default 'otros'
    check (categoria in ('comida', 'bebida', 'limpieza', 'suministros', 'alquiler', 'personal', 'servicios', 'mantenimiento', 'impuestos', 'otros')),
  base_centimos integer,
  iva_centimos integer,
  -- Negativo: un abono.
  total_centimos integer not null check (total_centimos between -10000000 and 10000000),
  -- [{ "tipo": 10, "base_centimos": 1000, "cuota_centimos": 100 }]
  iva jsonb not null default '[]'::jsonb check (jsonb_typeof(iva) = 'array'),
  -- [{ "texto": "…", "cantidad": 2, "precio_centimos": 150, "importe_centimos": 300 }]
  lineas jsonb not null default '[]'::jsonb check (jsonb_typeof(lineas) = 'array'),
  metodo_pago text check (metodo_pago in ('efectivo', 'tarjeta', 'transferencia', 'domiciliacion')),
  notas text,
  -- Ruta en el bucket privado laofi-gastos (<año>/<id>.jpg).
  documento_path text,
  -- Texto leído por el OCR y lo que propuso: con lo que se corrigió después,
  -- son las muestras para afinar las reglas del lector.
  ocr_texto text,
  ocr_lectura jsonb,
  creado_por uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index gastos_fecha_idx on laofi.gastos (fecha desc);
create index gastos_proveedor_idx on laofi.gastos (proveedor_id);

create trigger trg_gastos_updated_at before update on laofi.gastos for each row execute function public.set_updated_at();
create trigger trg_gastos_proveedores_updated_at before update on laofi.gastos_proveedores for each row execute function public.set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['gastos', 'gastos_proveedores'] loop
    execute format('alter table laofi.%I enable row level security', t);
    execute format('create policy %I on laofi.%I for all to authenticated using (laofi.es_gestor()) with check (laofi.es_gestor())', t || '_gestores', t);
    execute format('revoke all on laofi.%I from public, anon', t);
    execute format('grant select, insert, update, delete on laofi.%I to authenticated', t);
    execute format('grant all on laofi.%I to service_role', t);
  end loop;
end;
$$;

-- RPC ------------------------------------------------------------------------------------

/** Gastos entre dos fechas y la memoria de proveedores (para el lector). */
create or replace function public.laofi_admin_gastos(p_desde date, p_hasta date)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  perform laofi.exigir_rol('admin', 'encargado');
  return jsonb_build_object(
    'gastos', coalesce((select jsonb_agg(to_jsonb(g) - 'ocr_texto' - 'ocr_lectura' order by g.fecha desc, g.created_at desc)
                        from laofi.gastos g where g.fecha between p_desde and p_hasta), '[]'::jsonb),
    'proveedores', coalesce((select jsonb_agg(to_jsonb(p) order by p.veces desc, p.nombre) from laofi.gastos_proveedores p), '[]'::jsonb)
  );
end;
$$;

/**
 * Guarda un gasto (nuevo o editado) y aprende del proveedor: lo busca por CIF
 * o por nombre, se queda con el nombre y la categoría que se acaban de revisar
 * y añade como pista cómo lo leyó el OCR (p ->> 'proveedor_leido').
 */
create or replace function public.laofi_admin_guardar_gasto(p jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_nombre text := btrim(coalesce(p ->> 'proveedor', ''));
  v_cif text := nullif(upper(regexp_replace(coalesce(p ->> 'cif', ''), '[^A-Za-z0-9]', '', 'g')), '');
  v_numero text := nullif(btrim(coalesce(p ->> 'numero', '')), '');
  v_categoria text := coalesce(nullif(p ->> 'categoria', ''), 'otros');
  v_pista text := laofi.norm_gasto(p ->> 'proveedor_leido');
  v_prov laofi.gastos_proveedores;
  v_nuevo boolean;
  r laofi.gastos;
begin
  perform laofi.exigir_rol('admin', 'encargado');
  if v_nombre = '' then raise exception 'Falta el proveedor' using errcode = 'P0001'; end if;
  if nullif(p ->> 'total_centimos', '') is null then raise exception 'Falta el total' using errcode = 'P0001'; end if;
  v_nuevo := v_id is null or not exists (select 1 from laofi.gastos where id = v_id);

  -- Proveedor: primero por CIF (casi siempre se lee bien), luego por nombre.
  if v_cif is not null then
    select * into v_prov from laofi.gastos_proveedores where cif = v_cif;
  end if;
  if v_prov.id is null then
    select * into v_prov from laofi.gastos_proveedores
    where laofi.norm_gasto(nombre) = laofi.norm_gasto(v_nombre) and (cif is null or v_cif is null or cif = v_cif);
  end if;
  if v_prov.id is null then
    insert into laofi.gastos_proveedores (nombre, cif, categoria) values (v_nombre, v_cif, v_categoria) returning * into v_prov;
  else
    -- Otro proveedor ya se llama así: se conserva su nombre para no chocar.
    update laofi.gastos_proveedores set
      nombre = case when exists (select 1 from laofi.gastos_proveedores o
                                 where o.id <> v_prov.id and laofi.norm_gasto(o.nombre) = laofi.norm_gasto(v_nombre))
                    then nombre else v_nombre end,
      cif = coalesce(cif, v_cif),
      categoria = v_categoria
    where id = v_prov.id returning * into v_prov;
  end if;
  update laofi.gastos_proveedores set
    pistas = case when length(v_pista) >= 3 and v_pista <> laofi.norm_gasto(nombre) and not (v_pista = any (pistas))
                  then (pistas || v_pista)[greatest(1, cardinality(pistas) - 18):] else pistas end,
    veces = veces + case when v_nuevo then 1 else 0 end
  where id = v_prov.id;

  -- El mismo documento dos veces (mismo proveedor y número).
  if v_numero is not null and exists (
    select 1 from laofi.gastos g
    where g.proveedor_id = v_prov.id and laofi.norm_gasto(g.numero) = laofi.norm_gasto(v_numero) and g.id is distinct from v_id
  ) then
    raise exception 'Ese documento (% nº %) ya está apuntado', v_prov.nombre, v_numero using errcode = 'P0001';
  end if;

  if v_nuevo then
    insert into laofi.gastos (id, fecha, tipo, proveedor_id, proveedor, cif, numero, categoria, base_centimos, iva_centimos,
                              total_centimos, iva, lineas, metodo_pago, notas, documento_path, ocr_texto, ocr_lectura)
    values (coalesce(v_id, gen_random_uuid()),
            coalesce(nullif(p ->> 'fecha', '')::date, (now() at time zone 'Europe/Madrid')::date),
            coalesce(nullif(p ->> 'tipo', ''), 'factura'), v_prov.id, v_prov.nombre, coalesce(v_cif, v_prov.cif), v_numero, v_categoria,
            nullif(p ->> 'base_centimos', '')::int, nullif(p ->> 'iva_centimos', '')::int, (p ->> 'total_centimos')::int,
            coalesce(p -> 'iva', '[]'::jsonb), coalesce(p -> 'lineas', '[]'::jsonb), nullif(p ->> 'metodo_pago', ''),
            nullif(btrim(coalesce(p ->> 'notas', '')), ''), nullif(p ->> 'documento_path', ''),
            nullif(p ->> 'ocr_texto', ''), p -> 'ocr_lectura')
    returning * into r;
  else
    update laofi.gastos set
      fecha = coalesce(nullif(p ->> 'fecha', '')::date, fecha),
      tipo = coalesce(nullif(p ->> 'tipo', ''), tipo),
      proveedor_id = v_prov.id, proveedor = v_prov.nombre, cif = coalesce(v_cif, v_prov.cif), numero = v_numero,
      categoria = v_categoria,
      base_centimos = nullif(p ->> 'base_centimos', '')::int,
      iva_centimos = nullif(p ->> 'iva_centimos', '')::int,
      total_centimos = (p ->> 'total_centimos')::int,
      iva = coalesce(p -> 'iva', '[]'::jsonb),
      lineas = coalesce(p -> 'lineas', '[]'::jsonb),
      metodo_pago = nullif(p ->> 'metodo_pago', ''),
      notas = nullif(btrim(coalesce(p ->> 'notas', '')), ''),
      documento_path = coalesce(nullif(p ->> 'documento_path', ''), documento_path)
    where id = v_id returning * into r;
  end if;
  return to_jsonb(r) - 'ocr_texto' - 'ocr_lectura';
end;
$$;

/** Borra un gasto y devuelve la ruta de su documento (para quitarlo del bucket). */
create or replace function public.laofi_admin_borrar_gasto(p_id uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare v_path text;
begin
  perform laofi.exigir_rol('admin', 'encargado');
  delete from laofi.gastos where id = p_id returning documento_path into v_path;
  return v_path;
end;
$$;

/** Edita o borra un proveedor de la memoria (sus gastos se quedan con el nombre). */
create or replace function public.laofi_admin_proveedor_gasto(p_id uuid, p jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform laofi.exigir_rol('admin', 'encargado');
  if coalesce((p ->> 'borrar')::boolean, false) then
    delete from laofi.gastos_proveedores where id = p_id;
    return;
  end if;
  update laofi.gastos_proveedores set
    nombre = coalesce(nullif(btrim(p ->> 'nombre'), ''), nombre),
    cif = case when p ? 'cif' then nullif(upper(regexp_replace(coalesce(p ->> 'cif', ''), '[^A-Za-z0-9]', '', 'g')), '') else cif end,
    categoria = coalesce(nullif(p ->> 'categoria', ''), categoria),
    pistas = case when coalesce((p ->> 'olvidar_pistas')::boolean, false) then '{}' else pistas end
  where id = p_id;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array['public.laofi_admin_gastos(date, date)', 'public.laofi_admin_guardar_gasto(jsonb)',
                           'public.laofi_admin_borrar_gasto(uuid)', 'public.laofi_admin_proveedor_gasto(uuid, jsonb)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end;
$$;
revoke all on function laofi.norm_gasto(text) from public, anon;
grant execute on function laofi.norm_gasto(text) to authenticated, service_role;

-- Documentos (solo en Supabase: PGlite no tiene Storage) ---------------------------------
do $$
begin
  if to_regclass('storage.buckets') is null then return; end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('laofi-gastos', 'laofi-gastos', false, 5242880, array['image/jpeg'])
  on conflict (id) do nothing;
  execute 'drop policy if exists laofi_gastos_lectura on storage.objects';
  execute 'create policy laofi_gastos_lectura on storage.objects for select to authenticated using (bucket_id = ''laofi-gastos'' and laofi.es_gestor())';
  execute 'drop policy if exists laofi_gastos_subida on storage.objects';
  execute 'create policy laofi_gastos_subida on storage.objects for insert to authenticated with check (bucket_id = ''laofi-gastos'' and laofi.es_gestor())';
  execute 'drop policy if exists laofi_gastos_borrado on storage.objects';
  execute 'create policy laofi_gastos_borrado on storage.objects for delete to authenticated using (bucket_id = ''laofi-gastos'' and laofi.es_gestor())';
end;
$$;
