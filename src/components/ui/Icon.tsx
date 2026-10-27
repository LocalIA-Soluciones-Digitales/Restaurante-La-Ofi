// Iconos de trazo (24×24) en SVG inline: sin librerías ni peticiones extra.
const PATHS = {
  phone:
    "M5 4h3l1.5 4-2 1.5a11 11 0 0 0 7 7L16 14.5l4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z",
  pin: "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  menu: "M4 7h16M4 12h16M4 17h10",
  close: "M6 6l12 12M18 6 6 18",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  instagram:
    "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm5 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm5.5-9.5h.01",
  coffee: "M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Zm12 1h1.5a2.5 2.5 0 0 1 0 5H16M8 3v3M12 3v3",
  sunrise: "M4 18h16M7 14a5 5 0 0 1 10 0M12 4v3M5.6 7.6l1.8 1.8M18.4 7.6l-1.8 1.8M2 14h2M20 14h2",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-13v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17m10-10 1.4-1.4",
  sunset: "M4 18h16M7 14a5 5 0 0 1 10 0M12 3v4m0 0-2-2m2 2 2-2M2 14h2M20 14h2",
  moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z",
  calendar: "M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm-1 5h16M8 3v4m8-4v4",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2",
  utensils: "M7 3v8m-3-8v5a3 3 0 0 0 6 0V3M7 11v10m10-18c-2 1-3 4-3 7h3v11",
  flame: "M12 21a6 6 0 0 0 6-6c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-3-2 2-3 4-3 7a6 6 0 0 0 6 6Z",
  music: "M9 18V6l11-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm11-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  check: "m5 12 5 5L20 7",
  whatsapp:
    "M4 20l1.3-3.9A8 8 0 1 1 8 19l-4 1Zm5-11c0 3 3 6 6 6l1.5-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2L9 9Z",
  chevronLeft: "m15 5-7 7 7 7",
  chevronRight: "m9 5 7 7-7 7",
  egg: "M12 21c-4 0-6.5-2.8-6.5-6.6C5.5 9.6 8.5 3 12 3s6.5 6.6 6.5 11.4c0 3.8-2.5 6.6-6.5 6.6Z",
  chevronDown: "m5 9 7 7 7-7",
  chevronUp: "m5 15 7-7 7 7",
  bag: "M5 8h14l-1 12H6L5 8Zm4 0V6a3 3 0 0 1 6 0v2",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  trash: "M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4",
  filter: "M4 6h16M7 12h10M10 18h4",
  play: "M8 5v14l11-7L8 5Z",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 20a6 6 0 0 0-2.5-4.9",
  briefcase: "M4 8h16v11H4V8Zm5 0V5h6v3M4 13h16",
  car: "M5 16h14v-4l-2-5H7l-2 5v4Zm0 0v2m14-2v2M7.5 13.5h.01m9 0h.01",
  accessible: "M12 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm-1 2h2v6h4l2 5M11 11H7m3.5 9a5 5 0 1 1 0-10",
  star: "m12 3 2.7 5.6 6.1.8-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.8L12 3Z",
  wine: "M8 3h8l-.5 6a3.5 3.5 0 0 1-7 0L8 3Zm4 9.5V20m-3 0h6",
  leaf: "M5 19C5 10 11 5 20 4c-1 9-6 15-15 15Zm0 0 7-7",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-11v6m0-9h.01",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2Zm4 4h4",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6m-6 4h3",
  qr: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h2v2h-2v-2Zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v2h-2z",
  share: "M8 12a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm13-6.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm0 13a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM8 11l8-4.5M8 13l8 4.5",
  card: "M3 6h18v12H3V6Zm0 4h18M7 15h3",
  cash: "M3 7h18v10H3V7Zm9 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6 10v4m12-4v4",
  print: "M7 8V3h10v5M7 17H4v-7h16v7h-3M7 14h10v7H7v-7Z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z",
  chart: "M4 20V4m0 16h16M8 16v-4m4 4V8m4 8v-6",
  grid: "M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z",
  logout: "M10 4H5v16h5m4-12 4 4-4 4m4-4H9",
  edit: "m4 20 1-4L16 5l3 3L8 19l-4 1Zm10-13 3 3",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  move: "M12 3v18M3 12h18M12 3l-3 3m3-3 3 3m-3 15-3-3m3 3 3-3M3 12l3-3m-3 3 3 3m15-3-3-3m3 3-3 3",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11.5 6.8M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5",
  lock: "M6 11h12v9H6v-9Zm2 0V8a4 4 0 0 1 8 0v3",
  refresh: "M20 11a8 8 0 0 0-14.6-4.5L4 8m0-4v4h4m-4 5a8 8 0 0 0 14.6 4.5L20 16m0 4v-4h-4",
  download: "M12 4v11m-4-4 4 4 4-4M5 20h14",
  fullscreen: "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5",
  sound: "M4 9h4l5-4v14l-5-4H4V9Zm12 0a4 4 0 0 1 0 6m2.5-8.5a7.5 7.5 0 0 1 0 11",
  tag: "M3 12V4h8l10 10-8 8L3 12Zm5-4h.01",
  gift: "M4 10h16v10H4V10Zm-1-4h18v4H3V6Zm9 0v14M12 6S9 2 7.5 3.5 9 6 12 6Zm0 0s3-4 4.5-2.5S15 6 12 6Z",
} as const;

export type IconName = keyof typeof PATHS;

/** Icono decorativo: el texto accesible lo aporta siempre el elemento que lo contiene. */
export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
