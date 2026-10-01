import type { Locale } from "@/lib/i18n";

// Textos de interfaz (navegación, botones, estados). El contenido editorial de
// cada página vive en sus componentes en castellano en V1. Para activar euskera:
// añadir `eu` aquí con una traducción revisada y activarlo en ENABLED_LOCALES.
const es = {
  nav: {
    inicio: "Inicio",
    carta: "Carta",
    menuDelDia: "Menú del día",
    eventos: "Eventos",
    espacios: "Espacios",
    empresas: "Empresas",
    laOfi: "La Ofi",
    galeria: "Galería",
    contacto: "Contacto",
  },
  cta: {
    reservar: "Reservar",
    pedir: "Pedir",
    llamar: "Llamar",
    comoLlegar: "Cómo llegar",
    verCarta: "Ver carta",
    verMenu: "Menú del día",
    verMenuCompleto: "Ver menú completo",
    verEventos: "Ver todos los eventos",
    abrirMenu: "Abrir menú",
    cerrarMenu: "Cerrar menú",
  },
  common: {
    saltarContenido: "Saltar al contenido",
    ejemplo: "Ejemplo",
    proximamente: "Próximamente",
    precioConsultar: "Consultar precio",
  },
} as const;

export type Dictionary = typeof es;

const dictionaries: Partial<Record<Locale, Dictionary>> = { es };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? es;
}
