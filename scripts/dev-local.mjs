// `npm run dev:local`: servidor de desarrollo con el backend LOCAL en memoria
// (PGlite + todas las migraciones + datos de prueba). Sin Docker y sin tocar el
// Supabase compartido. Ver README → "Backend local".
import { spawn } from "node:child_process";

const child = spawn("npx", ["next", "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, LAOFI_PGLITE: "1" },
});
child.on("exit", (code) => process.exit(code ?? 0));
