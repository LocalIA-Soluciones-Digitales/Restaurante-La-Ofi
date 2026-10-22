-- Reversión de 20261022110000_laofi_mesa_por_numero. Sin datos: solo la RPC.
-- Ejecutar ANTES que las reversiones anteriores.
drop function if exists public.laofi_mesa_por_numero(uuid, text);
