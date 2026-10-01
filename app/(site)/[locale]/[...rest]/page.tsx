import { notFound } from "next/navigation";

// Cualquier ruta desconocida bajo /es/... muestra el 404 con el diseño del sitio
// (el layout de idioma fija dynamicParams=false; aquí se reactiva).
export const dynamicParams = true;

export default function CatchAll() {
  notFound();
}
