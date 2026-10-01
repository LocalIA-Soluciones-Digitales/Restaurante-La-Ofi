-- Reversión completa de La Ofi (migraciones 20261001150000 y 20261001150100).
-- ATENCIÓN: borra todos los datos de La Ofi (carta, menús, eventos, horario).
-- Hacer copia antes si hay datos. No afecta a ningún otro proyecto: todo vive en
-- el schema laofi salvo las RPC public.laofi_*, que se eliminan aquí.
-- La fila de public.clientes (seed) se conserva; borrarla aparte si procede.
drop function if exists public.laofi_get_carta(uuid);
drop function if exists public.laofi_get_menu_dia(uuid, date);
drop function if exists public.laofi_get_eventos(uuid, boolean);
drop function if exists public.laofi_get_evento(uuid, text);
drop function if exists public.laofi_get_horario(uuid);
drop schema if exists laofi cascade;
