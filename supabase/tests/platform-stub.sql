-- Réplica MÍNIMA del núcleo de la plataforma LocalIA en Supabase, solo para
-- probar las migraciones de La Ofi en local (PGlite) sin tocar el proyecto real.
-- Las definiciones de las funciones son copia literal de las de producción
-- (consultadas en solo lectura el 2026-10-01); auth.uid()/auth.jwt() se simulan
-- con variables de sesión.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select jsonb_build_object('email', nullif(current_setting('test.email', true), ''))
$$;
grant usage on schema auth to anon, authenticated, service_role;

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre_negocio text not null,
  slug text not null unique,
  tipo_proyecto text not null default 'web' check (tipo_proyecto in ('web', 'ecommerce', 'saas')),
  contacto_nombre text,
  contacto_email text,
  contacto_telefono text,
  estado text not null default 'activo' check (estado in ('activo', 'pausado', 'baja')),
  fecha_alta timestamptz not null default now(),
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  site_key uuid not null unique default gen_random_uuid()
);

create table public.usuarios_negocio (
  user_id uuid primary key,
  cliente_id uuid not null references public.clientes(id),
  rol text not null default 'gestion'
);

create function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.cliente_id_from_site_key(p_site_key uuid) returns uuid
language sql stable security definer set search_path to 'public' as $$
  select id from public.clientes where site_key = p_site_key and estado = 'activo';
$$;

create function public.mi_cliente_id() returns uuid
language sql stable security definer set search_path to 'public' as $$
  select cliente_id from public.usuarios_negocio where user_id = auth.uid();
$$;

create function public.is_developer() returns boolean
language sql stable set search_path to 'public' as $$
  select (auth.jwt() ->> 'email') = any (array['edortadossantos@gmail.com', 'admin@developers.local']);
$$;

-- Schema restaurant con los privilegios por defecto que tiene en producción.
create schema restaurant;
grant usage on schema restaurant to authenticated, service_role;
alter default privileges in schema restaurant grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema restaurant grant all on tables to service_role;

-- Tablas existentes que usa el seed opcional (subconjunto de columnas).
create table restaurant.categorias (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id),
  nombre text not null,
  slug text not null,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  tipo text
);
create table restaurant.productos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id),
  categoria_id uuid references restaurant.categorias(id),
  nombre text not null,
  descripcion text,
  precio_centimos integer not null default 0,
  imagen_url text,
  disponible boolean not null default true,
  destacado boolean not null default false,
  alergenos text[] not null default '{}',
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
