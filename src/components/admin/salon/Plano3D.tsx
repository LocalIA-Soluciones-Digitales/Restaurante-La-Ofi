"use client";

import { Html, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { posicionesPorDefecto, tamanoMesa } from "@/lib/admin/plano";
import { ESTADO_MESA, estadoMesa, type MesaSalon, type Zona } from "@/lib/admin/types";

// Plano 3D del salón (react-three-fiber). A diferencia del Floorplan3D de
// Palomita, modelado a mano para su local, este se construye a partir de los
// datos (zonas y mesas del editor): sirve para el local real en cuanto se dibuje.
// Se carga con dynamic() solo al pulsar "3D": three.js no entra en ningún otro sitio.

const ESCALA = 20; // el lienzo 100×100 (%) ocupa 20×12.4 unidades
const ANCHO = ESCALA;
const FONDO = ESCALA * 0.62;
const SUELO: Record<Zona["tipo"], string> = {
  barra: "#cfd6e2",
  comedor: "#e8dcc6",
  despacho: "#ecd2c4",
  terraza: "#c9d4b4",
  otra: "#dedede",
};

const aMundo = (x: number, y: number): [number, number] => [(x / 100) * ANCHO - ANCHO / 2, (y / 100) * FONDO - FONDO / 2];

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
  return (
    <div className="h-[62vh] min-h-[420px] w-full overflow-hidden rounded-[1.5rem] bg-noche">
      <Canvas camera={{ position: [0, 14, 13], fov: 45 }} shadows dpr={[1, 1.75]}>
        <color attach="background" args={["#0B1424"]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[6, 14, 8]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
        {/* Neón lavanda del rótulo, como luz de ambiente */}
        <pointLight position={[-ANCHO / 2 + 2, 3, -FONDO / 2 + 1]} intensity={8} distance={12} color="#C9BBFF" />

        <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow>
          <planeGeometry args={[ANCHO + 2, FONDO + 2]} />
          <meshStandardMaterial color="#1A2944" />
        </mesh>

        {zonas.map((z) => {
          const [x, zz] = aMundo(Number(z.x) + Number(z.ancho) / 2, Number(z.y) + Number(z.alto) / 2);
          return (
            <group key={z.id} position={[x, 0, zz]}>
              <mesh receiveShadow>
                <boxGeometry args={[(Number(z.ancho) / 100) * ANCHO, 0.05, (Number(z.alto) / 100) * FONDO]} />
                <meshStandardMaterial color={SUELO[z.tipo]} />
              </mesh>
              <Html position={[-(Number(z.ancho) / 200) * ANCHO + 0.4, 0.1, -(Number(z.alto) / 200) * FONDO + 0.3]} center={false} style={{ pointerEvents: "none" }}>
                <span style={{ color: "#F4F0FF", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", textShadow: "0 1px 3px #000" }}>{z.nombre}</span>
              </Html>
            </group>
          );
        })}

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
          return (
            <group
              key={m.id}
              position={[x, 0, z]}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(m.id);
              }}
            >
              <mesh position={[0, alto, 0]} castShadow>
                {redonda ? <cylinderGeometry args={[ancho / 2, ancho / 2, 0.08, 32]} /> : <boxGeometry args={[ancho, 0.08, fondo]} />}
                <meshStandardMaterial color={ESTADO_MESA[est].color} emissive={sel ? "#C9BBFF" : "#000"} emissiveIntensity={sel ? 0.5 : 0} />
              </mesh>
              <mesh position={[0, alto / 2, 0]} castShadow>
                <cylinderGeometry args={[0.05, 0.08, alto, 12]} />
                <meshStandardMaterial color="#2B2722" />
              </mesh>
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
          );
        })}

        <OrbitControls makeDefault enablePan maxPolarAngle={Math.PI / 2.2} minDistance={6} maxDistance={32} />
      </Canvas>
    </div>
  );
}
