"use client";

import { Html, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { posicionesPorDefecto, puestosMesa, tamanoMesa } from "@/lib/admin/plano";
import { ESTADO_MESA, estadoMesa, type MesaSalon, type Zona } from "@/lib/admin/types";

// Plano 3D del salón (react-three-fiber). Se construye a partir de los datos
// (zonas y mesas del editor), así que se adapta solo si se redibuja el local. La
// ambientación sigue las fotos públicas del local (IMAGES_SOURCES.md): pabellón de
// una planta con fachada de cristal hacia la terraza, barra con el neón "la ofi" y
// lámparas negras, comedor con lámparas de ratán, suelo hexagonal y botellero,
// comedor privado con bombillas de cuerda, terraza bajo carpa con luz morada y
// zona chill-out con sofás sobre césped. Es una representación, no un plano a
// escala: las medidas reales están pendientes del croquis (CONTENT_NEEDED.md).
// Se carga con dynamic() solo al pulsar "3D": three.js no entra en ningún otro sitio.

const ESCALA = 20; // el lienzo 100×100 (%) ocupa 20×12.4 unidades
const ANCHO = ESCALA;
const FONDO = ESCALA * 0.62;
const ALTURA = 2.6;
const INTERIOR: Zona["tipo"][] = ["barra", "comedor", "despacho"];

const aMundo = (x: number, y: number): [number, number] => [(x / 100) * ANCHO - ANCHO / 2, (y / 100) * FONDO - FONDO / 2];

interface Caja {
  cx: number;
  cz: number;
  w: number;
  d: number;
}

function caja(z: Zona): Caja {
  const [cx, cz] = aMundo(Number(z.x) + Number(z.ancho) / 2, Number(z.y) + Number(z.alto) / 2);
  return { cx, cz, w: (Number(z.ancho) / 100) * ANCHO, d: (Number(z.alto) / 100) * FONDO };
}

const esChillOut = (z: Zona) => z.tipo === "otra" && /chill|lounge/i.test(`${z.slug} ${z.nombre}`);

/** Baldosa hexagonal del comedor (gris, blanco y azul, como en las fotos). */
function useSueloHexagonal() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#e9e4da";
    g.fillRect(0, 0, 256, 256);
    const r = 16;
    const tonos = ["#f4f2ee", "#c9ced6", "#8f9db3", "#5d6f8c", "#dfe3e8"];
    let k = 0;
    for (let fila = 0; fila < 12; fila++) {
      for (let col = 0; col < 10; col++) {
        const x = col * r * 1.5;
        const y = fila * r * Math.sqrt(3) + (col % 2 ? (r * Math.sqrt(3)) / 2 : 0);
        g.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i;
          g.lineTo(x + r * 0.94 * Math.cos(a), y + r * 0.94 * Math.sin(a));
        }
        g.closePath();
        g.fillStyle = tonos[(k = (k * 7 + 3) % tonos.length)]!;
        g.fill();
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

function Suelo({ z, hex }: { z: Zona; hex: THREE.Texture }) {
  const { cx, cz, w, d } = caja(z);
  const tex = useMemo(() => {
    if (z.tipo !== "comedor") return null;
    const t = hex.clone();
    t.repeat.set(w / 2.2, d / 2.2);
    t.needsUpdate = true;
    return t;
  }, [hex, z.tipo, w, d]);
  const color = { barra: "#b9b6b0", comedor: "#ffffff", despacho: "#d9cdbf", terraza: "#3c4352", otra: esChillOut(z) ? "#3f6b3f" : "#9aa1ab" }[z.tipo];
  return (
    <mesh position={[cx, 0.02, cz]} rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color={color} map={tex} roughness={0.85} />
    </mesh>
  );
}

/** Pared trasera, laterales y fachada de cristal (hacia la terraza) de una zona interior. */
function Envolvente({ z, extremoIzq, extremoDer }: { z: Zona; extremoIzq: boolean; extremoDer: boolean }) {
  const { cx, cz, w, d } = caja(z);
  const montantes = Math.max(2, Math.round(w / 1.1));
  const lateral = (lado: -1 | 1, vidrio: boolean) => (
    <mesh position={[cx + (lado * w) / 2, ALTURA / 2, cz]} castShadow>
      <boxGeometry args={[0.08, ALTURA, d]} />
      {vidrio ? <meshStandardMaterial color="#9fc2ff" transparent opacity={0.16} /> : <meshStandardMaterial color="#e6e8ec" />}
    </mesh>
  );
  return (
    <group>
      <mesh position={[cx, ALTURA / 2, cz - d / 2]} receiveShadow>
        <boxGeometry args={[w, ALTURA, 0.12]} />
        <meshStandardMaterial color={z.tipo === "barra" ? "#f1f3f7" : "#dcd8d0"} />
      </mesh>
      {extremoIzq || z.tipo === "despacho" ? lateral(-1, false) : null}
      {extremoDer || z.tipo === "despacho" ? lateral(1, z.tipo === "despacho" && !extremoDer) : null}
      {/* Fachada acristalada con montantes oscuros */}
      <mesh position={[cx, ALTURA / 2, cz + d / 2]}>
        <boxGeometry args={[w, ALTURA, 0.04]} />
        <meshStandardMaterial color="#a9cbff" transparent opacity={0.14} depthWrite={false} />
      </mesh>
      {Array.from({ length: montantes + 1 }, (_, i) => (
        <mesh key={i} position={[cx - w / 2 + (w * i) / montantes, ALTURA / 2, cz + d / 2]}>
          <boxGeometry args={[0.05, ALTURA, 0.06]} />
          <meshStandardMaterial color="#2a2f38" />
        </mesh>
      ))}
      <mesh position={[cx, ALTURA, cz + d / 2]}>
        <boxGeometry args={[w, 0.12, 0.1]} />
        <meshStandardMaterial color="#c9ccd2" />
      </mesh>
    </group>
  );
}

/** Barra: mostrador de listones de madera, encimera negra, cafeteras, lámparas negras y neón "la ofi". */
function Barra({ z }: { z: Zona }) {
  const { cx, cz, w, d } = caja(z);
  const largo = w * 0.72;
  const zc = cz - d / 2 + Math.min(1.1, d * 0.28);
  const lamparas = Math.max(3, Math.round(largo / 1.1));
  return (
    <group>
      <mesh position={[cx, 0.55, zc]} castShadow receiveShadow>
        <boxGeometry args={[largo, 1.1, 0.55]} />
        <meshStandardMaterial color="#d8c19c" roughness={0.7} />
      </mesh>
      <mesh position={[cx, 1.12, zc]} castShadow>
        <boxGeometry args={[largo + 0.1, 0.05, 0.7]} />
        <meshStandardMaterial color="#141414" roughness={0.3} />
      </mesh>
      {[-0.32, -0.18].map((f) => (
        <mesh key={f} position={[cx + largo * f, 1.33, zc - 0.05]} castShadow>
          <boxGeometry args={[0.5, 0.38, 0.4]} />
          <meshStandardMaterial color="#b9bec6" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      {/* Estantería de botellas detrás */}
      <mesh position={[cx + largo * 0.3, 1.5, cz - d / 2 + 0.2]}>
        <boxGeometry args={[largo * 0.32, 1.2, 0.25]} />
        <meshStandardMaterial color="#c79a5b" />
      </mesh>
      {Array.from({ length: lamparas }, (_, i) => {
        const x = cx - largo / 2 + (largo * (i + 0.5)) / lamparas;
        return (
          <group key={i} position={[x, 0, zc + 0.15]}>
            <mesh position={[0, 2.45, 0]}>
              <cylinderGeometry args={[0.006, 0.006, 0.3, 4]} />
              <meshBasicMaterial color="#111" />
            </mesh>
            <mesh position={[0, 2.22, 0]}>
              <coneGeometry args={[0.17, 0.16, 20, 1, true]} />
              <meshStandardMaterial color="#111" side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 2.16, 0]}>
              <sphereGeometry args={[0.06, 12, 12]} />
              <meshStandardMaterial color="#fff2d6" emissive="#ffd9a0" emissiveIntensity={2} />
            </mesh>
          </group>
        );
      })}
      <pointLight position={[cx, 2.1, zc + 0.4]} intensity={6} distance={6} color="#ffd9a0" />
      {/* Neón lavanda sobre azulejo blanco */}
      <pointLight position={[cx - largo * 0.25, 1.8, cz - d / 2 + 0.5]} intensity={5} distance={5} color="#c9bbff" />
      <Html transform position={[cx - largo * 0.25, 1.8, cz - d / 2 + 0.08]} scale={0.32} style={{ pointerEvents: "none" }}>
        <span style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: 64, fontWeight: 600, color: "#f6f2ff", textShadow: "0 0 6px #c9bbff, 0 0 18px #9d86ff, 0 0 36px #7a5cff", whiteSpace: "nowrap" }}>
          la ofi
        </span>
      </Html>
    </group>
  );
}

/** Lámpara de ratán colgante (comedor). */
function LamparaRatan({ x, z, escala = 1 }: { x: number; z: number; escala?: number }) {
  return (
    <group position={[x, 0, z]} scale={escala}>
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.25, 4]} />
        <meshBasicMaterial color="#222" />
      </mesh>
      <mesh position={[0, 2.18, 0]}>
        <cylinderGeometry args={[0.13, 0.26, 0.42, 18, 1, true]} />
        <meshStandardMaterial color="#c9a46a" emissive="#ffb35c" emissiveIntensity={0.55} side={THREE.DoubleSide} roughness={1} />
      </mesh>
    </group>
  );
}

/** Botellero de pared (comedor). */
function Botellero({ x, z }: { x: number; z: number }) {
  const botellas = useMemo(() => Array.from({ length: 6 * 9 }, (_, i) => ({ c: i % 6, f: Math.floor(i / 6) })), []);
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[1.4, 2.3, 0.22]} />
        <meshStandardMaterial color="#1c1c1f" />
      </mesh>
      {botellas.map(({ c, f }) => (
        <mesh key={`${c}-${f}`} position={[-0.55 + c * 0.22, 0.25 + f * 0.24, 0.12]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.035, 0.035, 0.12, 8]} />
          <meshStandardMaterial color={(c + f) % 3 ? "#4a1f2a" : "#2f4a2a"} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

/** Comedor privado: bombillas colgadas de cuerdas. */
function BombillasCuerda({ z }: { z: Zona }) {
  const { cx, cz, w, d } = caja(z);
  const puntos = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) out.push([cx - w * 0.35 + (w * 0.7 * i) / 3, 1.75 + ((i + j) % 3) * 0.18, cz - d * 0.3 + (d * 0.6 * j) / 2]);
    return out;
  }, [cx, cz, w, d]);
  return (
    <group>
      {puntos.map(([x, y, zz], i) => (
        <group key={i} position={[x, 0, zz]}>
          <mesh position={[0, (y + ALTURA) / 2, 0]}>
            <cylinderGeometry args={[0.012, 0.012, ALTURA - y, 4]} />
            <meshStandardMaterial color="#d8b7a0" />
          </mesh>
          <mesh position={[0, y, 0]}>
            <sphereGeometry args={[0.09, 14, 14]} />
            <meshStandardMaterial color="#fff1d0" emissive="#ffc27a" emissiveIntensity={2.2} />
          </mesh>
        </group>
      ))}
      <pointLight position={[cx, 1.9, cz]} intensity={5} distance={5} color="#ffb3a0" />
    </group>
  );
}

/** Carpa tensada sobre la terraza, translúcida para ver las mesas desde arriba. */
function Carpa({ z }: { z: Zona }) {
  const { cx, cz, w, d } = caja(z);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(w, d, 24, 16);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position!;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / w + 0.5;
      const v = p.getZ(i) / d + 0.5;
      // Picos en los mástiles y valles entre ellos, como una carpa tensada.
      p.setY(i, 2.9 + 0.55 * Math.abs(Math.sin(Math.PI * u * 2)) * Math.sin(Math.PI * v) + 0.25 * Math.sin(Math.PI * v));
    }
    g.computeVertexNormals();
    return g;
  }, [w, d]);
  const mastiles: [number, number][] = [
    [-w / 2, -d / 2], [0, -d / 2], [w / 2, -d / 2],
    [-w / 2, d / 2], [0, d / 2], [w / 2, d / 2],
    [-w / 4, 0], [w / 4, 0],
  ];
  return (
    <group position={[cx, 0, cz]}>
      <mesh geometry={geo}>
        <meshStandardMaterial color="#f4f1ff" emissive="#5b3fd6" emissiveIntensity={0.35} transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {mastiles.map(([x, zz], i) => (
        <mesh key={i} position={[x, 1.55, zz]} castShadow>
          <cylinderGeometry args={[0.04, 0.05, 3.1, 8]} />
          <meshStandardMaterial color="#d9dce2" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* Tira de luz cálida en el borde, como en la foto nocturna */}
      <mesh position={[0, 2.35, d / 2]}>
        <boxGeometry args={[w, 0.03, 0.03]} />
        <meshStandardMaterial color="#fff1d6" emissive="#ffe2b0" emissiveIntensity={2} />
      </mesh>
      <pointLight position={[-w / 4, 2.4, 0]} intensity={7} distance={8} color="#6c4dff" />
      <pointLight position={[w / 4, 2.4, 0]} intensity={7} distance={8} color="#2f7bff" />
    </group>
  );
}

/** Zona chill-out: sofás bajos de exterior y mesitas sobre césped. */
function ChillOut({ z }: { z: Zona }) {
  const { cx, cz, w, d } = caja(z);
  const grupos: [number, number][] = [
    [cx - w * 0.22, cz - d * 0.2],
    [cx + w * 0.22, cz + d * 0.2],
  ];
  return (
    <group>
      {grupos.map(([x, zz], i) => (
        <group key={i} position={[x, 0, zz]}>
          {[
            [0, -0.55, 0],
            [-0.6, 0.05, Math.PI / 2],
            [0.6, 0.05, -Math.PI / 2],
          ].map(([sx, sz, rot], j) => (
            <group key={j} position={[sx!, 0, sz!]} rotation-y={rot!}>
              <mesh position={[0, 0.2, 0]} castShadow>
                <boxGeometry args={[0.95, 0.4, 0.45]} />
                <meshStandardMaterial color="#2b2f38" roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.42, -0.17]} castShadow>
                <boxGeometry args={[0.95, 0.35, 0.12]} />
                <meshStandardMaterial color="#2b2f38" roughness={0.9} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 0.17, 0]} castShadow>
            <boxGeometry args={[0.55, 0.34, 0.45]} />
            <meshStandardMaterial color="#1f232b" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Sillas alrededor de una mesa según su forma y capacidad. */
function Sillas({ forma, capacidad, ancho, fondo, color }: { forma: MesaSalon["forma"]; capacidad: number; ancho: number; fondo: number; color: string }) {
  // Respaldo (z local negativo) mirando hacia fuera de la mesa.
  const puestos = useMemo(
    () => puestosMesa(forma, capacidad, ancho, fondo, 0.22).map((p) => ({ x: p.x, z: p.y, rot: -p.rot - Math.PI / 2 })),
    [forma, capacidad, ancho, fondo],
  );
  const taburete = forma === "taburete";
  return (
    <>
      {puestos.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} rotation-y={p.rot}>
          <mesh position={[0, taburete ? 0.72 : 0.45, 0]} castShadow>
            {taburete ? <cylinderGeometry args={[0.13, 0.13, 0.05, 14]} /> : <boxGeometry args={[0.3, 0.05, 0.3]} />}
            <meshStandardMaterial color={color} />
          </mesh>
          {taburete ? (
            <mesh position={[0, 0.36, 0]}>
              <cylinderGeometry args={[0.02, 0.03, 0.72, 6]} />
              <meshStandardMaterial color="#1b1b1b" />
            </mesh>
          ) : (
            <mesh position={[0, 0.66, -0.14]} castShadow>
              <boxGeometry args={[0.3, 0.36, 0.04]} />
              <meshStandardMaterial color={color} />
            </mesh>
          )}
        </group>
      ))}
    </>
  );
}

export default function Plano3D({
  zonas,
  mesas,
  seleccion,
  onSelect,
}: {
  zonas: Zona[];
  mesas: MesaSalon[];
  seleccion: string | null;
  onSelect: (id: string) => void;
}) {
  const pos = posicionesPorDefecto(zonas, mesas);
  const hex = useSueloHexagonal();
  const interiores = zonas.filter((z) => INTERIOR.includes(z.tipo));
  const izq = Math.min(...interiores.map((z) => Number(z.x)));
  const der = Math.max(...interiores.map((z) => Number(z.x) + Number(z.ancho)));
  const zonaDe = new Map(zonas.map((z) => [z.id, z]));

  return (
    <div className="h-[62vh] min-h-[420px] w-full overflow-hidden rounded-[1.5rem] bg-noche">
      <Canvas camera={{ position: [0, 15, 14], fov: 45 }} shadows dpr={[1, 1.75]}>
        <color attach="background" args={["#0B1424"]} />
        <fog attach="fog" args={["#0B1424", 26, 48]} />
        <ambientLight intensity={0.5} />
        <hemisphereLight args={["#bcc8ff", "#1b2a1e", 0.35]} />
        <directionalLight position={[6, 14, 8]} intensity={0.9} castShadow shadow-mapSize={[1024, 1024]} />

        {/* Césped alrededor del pabellón */}
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[ANCHO + 8, FONDO + 8]} />
          <meshStandardMaterial color="#1d3324" />
        </mesh>

        {zonas.map((z) => (
          <group key={z.id}>
            <Suelo z={z} hex={hex} />
            {INTERIOR.includes(z.tipo) ? (
              <Envolvente z={z} extremoIzq={Number(z.x) === izq} extremoDer={Number(z.x) + Number(z.ancho) === der} />
            ) : null}
            {z.tipo === "barra" ? <Barra z={z} /> : null}
            {z.tipo === "comedor" ? (
              <>
                <Botellero x={caja(z).cx + caja(z).w / 2 - 1} z={caja(z).cz - caja(z).d / 2 + 0.15} />
                <pointLight position={[caja(z).cx, 2.1, caja(z).cz]} intensity={8} distance={9} color="#ffbf73" />
              </>
            ) : null}
            {z.tipo === "despacho" ? <BombillasCuerda z={z} /> : null}
            {z.tipo === "terraza" ? <Carpa z={z} /> : null}
            {esChillOut(z) ? <ChillOut z={z} /> : null}
            <Html position={[caja(z).cx - caja(z).w / 2 + 0.3, 0.1, caja(z).cz - caja(z).d / 2 + 0.35]} center={false} style={{ pointerEvents: "none" }}>
              <span style={{ color: "#F4F0FF", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", textShadow: "0 1px 3px #000" }}>{z.nombre}</span>
            </Html>
          </group>
        ))}

        {mesas.map((m) => {
          const p = pos.get(m.id)!;
          const [x, z] = aMundo(p.x, p.y);
          const { w, h } = tamanoMesa(m);
          const ancho = (w / 1000) * ANCHO;
          const fondo = (h / 620) * FONDO;
          const est = estadoMesa(m);
          const sel = seleccion === m.id;
          const redonda = m.forma === "redonda" || m.forma === "taburete";
          const alto = m.forma === "taburete" ? 1.0 : 0.75;
          const zona = m.zona_id ? zonaDe.get(m.zona_id) : undefined;
          const exterior = zona?.tipo === "terraza";
          return (
            <group key={m.id}>
              <group
                position={[x, 0, z]}
                rotation-y={(-Number(m.rotacion ?? 0) * Math.PI) / 180}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(m.id);
                }}
              >
                <mesh position={[0, alto, 0]} castShadow>
                  {redonda ? <cylinderGeometry args={[ancho / 2, ancho / 2, 0.06, 32]} /> : <boxGeometry args={[ancho, 0.06, fondo]} />}
                  <meshStandardMaterial color={ESTADO_MESA[est].color} emissive={sel ? "#C9BBFF" : "#000"} emissiveIntensity={sel ? 0.6 : 0} />
                </mesh>
                <mesh position={[0, alto / 2, 0]} castShadow>
                  <cylinderGeometry args={[0.04, 0.07, alto, 10]} />
                  <meshStandardMaterial color={exterior ? "#c9ccd2" : "#3a2f25"} />
                </mesh>
                <Sillas forma={m.forma} capacidad={m.capacidad} ancho={ancho} fondo={fondo} color={exterior ? "#2a2f3a" : "#b98b5e"} />
                {(m.aviso_camarero || m.pide_cuenta) && (
                  <mesh position={[0, alto + 0.6, 0]}>
                    <sphereGeometry args={[0.14, 16, 16]} />
                    <meshStandardMaterial color="#C9BBFF" emissive="#8E7CF0" emissiveIntensity={2} />
                  </mesh>
                )}
                <Html position={[0, alto + 0.25, 0]} center style={{ pointerEvents: "none" }}>
                  <span style={{ color: "#fff", fontSize: 13, fontWeight: 800, textShadow: "0 1px 3px #000" }}>
                    {m.numero}
                    {m.ocupada ? ` · ${m.comensales}p` : ""}
                  </span>
                </Html>
              </group>
              {zona?.tipo === "comedor" ? <LamparaRatan x={x} z={z} escala={m.capacidad > 4 ? 1.25 : 1} /> : null}
            </group>
          );
        })}

        <OrbitControls makeDefault enablePan maxPolarAngle={Math.PI / 2.15} minDistance={5} maxDistance={34} />
      </Canvas>
    </div>
  );
}
