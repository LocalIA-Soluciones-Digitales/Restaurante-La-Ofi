-- Reversión de 20261105300000_laofi_encargo_vino_recogida. Ejecutar ANTES que las reversiones anteriores.
-- laofi_crear_encargo_vino y encargo_vino_publico_json: volver a aplicar sus definiciones de
-- 20261102140000_laofi_encargos_vino.sql (sin día ni hora de recogida) antes de quitar la columna.
drop function if exists laofi.encargo_vino_recogida(text, text);
drop index if exists laofi.encargos_vino_recogida_idx;
