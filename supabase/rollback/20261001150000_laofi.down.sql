-- Reversión completa de La Ofi (migraciones 20261001150000 y 20261001150100).
-- ATENCIÓN: borra todos los datos de La Ofi (carta, menús, eventos, horario).
-- Hacer copia antes si hay datos. No afecta a ningún otro proyecto: todo vive en
-- el schema laofi salvo las RPC public.laofi_*, que se eliminan aquí.
-- La fila de public.clientes (seed) se conserva; borrarla aparte si procede.
-- Todas las RPC public.laofi_* (las de esta migración y las de las posteriores).
do $$
declare f regprocedure;
begin
  for f in select p.oid::regprocedure from pg_proc p
           where p.pronamespace = 'public'::regnamespace and p.proname like 'laofi\_%' loop
    execute format('drop function if exists %s', f);
  end loop;
end;
$$;
drop schema if exists laofi cascade;
