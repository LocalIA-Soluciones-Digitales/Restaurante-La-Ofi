"""Genera el manual de servicio de La Ofi (del QR al cierre de caja).

Salidas:
  docs/manual/manual-pedidos.html  -> documento completo (abre en el navegador; imprime a PDF A4)
  <dir>/manual-fragmento.html      -> mismo contenido sin <html>/<head> (para publicarlo como página)

Las capturas viven en docs/manual/capturas/ y son reales (backend local, `npm run dev:local`).
Uso: python scripts/manual/generar.py [dir_fragmento]
PDF: abre docs/manual/manual-pedidos.html en Chrome/Edge → Imprimir → Guardar como PDF
(A4, márgenes predeterminados, «Gráficos de fondo» activado). La maqueta de impresión ya pone un paso por página.
"""

from __future__ import annotations

import html
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
DOCS = RAIZ / "docs" / "manual"

ROLES = {
    "cliente": ("Cliente", "cli"),
    "cocina": ("Cocina y barra", "coc"),
    "sala": ("Sala", "sal"),
    "encargado": ("Encargado/a", "enc"),
}

# Cada paso: rol, título, dónde, intro, acciones, capturas [(archivo, pie, movil, marcadores[(x%, y%)])], consejo.
# Los marcadores numerados se colocan sobre la captura y corresponden, en orden, a las acciones del paso.
PASOS = [
    dict(
        id="qr", rol="encargado", titulo="Prepara las mesas", donde="Mesas y QR → Imprimir QR",
        intro="Cada mesa tiene su propio código QR. Es lo que le dice al sistema desde qué mesa se pide.",
        acciones=[
            "Imprime los QR en lote a escala 100 % (plantilla de metacrilato A6).",
            "Coloca cada uno en su mesa. No los intercambies: el QR de la Mesa 1 siempre pide para la Mesa 1.",
            "Si uno se pierde o alguien lo usa desde fuera, regéneralo en Mesas y QR: el impreso deja de funcionar y se imprime el nuevo.",
        ],
        capturas=[("00-qr-imprimir", "Hoja de QR lista para imprimir", False, [])],
    ),
    dict(
        id="escanear", rol="cliente", titulo="El cliente escanea y elige cómo pedir", donde="Móvil del cliente",
        intro="Sin instalar nada ni registrarse: la cámara del móvil abre la carta de su mesa.",
        acciones=[
            "«Todos juntos»: una sola cuenta para la mesa; cualquiera puede añadir platos.",
            "«Cada uno lo suyo»: cada comensal pide y paga lo suyo, y se pueden compartir platos.",
        ],
        capturas=[("01-qr-bienvenida", "Bienvenida tras escanear el QR", True, [(50, 61), (50, 85)])],
    ),
    dict(
        id="pedir", rol="cliente", titulo="Elige los platos", donde="Carta de la mesa",
        intro="La carta muestra precios, alérgenos y filtros por momento del día. Siempre a mano: llamar al camarero y ver la cuenta.",
        acciones=[
            "«Llamar al camarero» avisa a sala con sonido.",
            "«Cuenta» enseña lo consumido y permite pedirla.",
            "«Añadir» mete el plato en el pedido; la barra inferior lleva la cuenta.",
        ],
        capturas=[
            ("02-carta", "Carta de la Mesa 1", True, [(27, 24.6), (66, 24.6), (79, 78)]),
            ("03-anadir-platos", "Tres platos añadidos", True, []),
        ],
    ),
    dict(
        id="enviar", rol="cliente", titulo="Revisa y envía el pedido", donde="Ver pedido",
        intro="Antes de enviar puede cambiar cantidades y dejar notas para cocina.",
        acciones=[
            "Notas para cocina: alergias, «sin miel», el punto de la carne…",
            "«Enviar pedido» lo manda al momento a cocina y barra. Puede volver a pedir cuando quiera: todo suma a la misma mesa.",
        ],
        capturas=[
            ("04-cesta", "El pedido antes de enviarlo", True, [(50, 70.5), (50, 96)]),
            ("05-pedido-enviado", "Seguimiento en vivo del pedido", True, []),
        ],
        consejo="El cliente ve el estado de su pedido en directo: Recibido → Aceptado → En preparación → ¡Listo! → Entregado.",
    ),
    dict(
        id="recibir", rol="sala", titulo="El local lo recibe", donde="Hoy",
        intro="La pantalla «Hoy» resume el servicio sin hacer scroll y se actualiza sola cada 10 segundos.",
        acciones=[
            "El contador «En cocina y barra» sube y avisa de cuántos pedidos están sin aceptar.",
            "«Pedidos en marcha» muestra la comanda nueva con su mesa y los minutos que lleva.",
            "«Nueva comanda» abre el TPV para quien prefiere pedir al camarero.",
        ],
        capturas=[("06-hoy-pedido-nuevo", "Hoy, con el pedido recién llegado", False, [(27, 27), (58, 46), (76, 15)])],
    ),
    dict(
        id="cocina", rol="cocina", titulo="Cocina y barra lo preparan", donde="Cocina y barra",
        intro="Cada comanda entra en «Nuevos» y avanza por columnas. Cocina y barra mueven solo sus propias líneas.",
        acciones=[
            "Pestañas Todos / Cocina / Barra: cada estación ve solo lo suyo.",
            "Las notas del cliente aparecen destacadas en la comanda.",
            "«Aceptar», después «Empezar» y por último «Listo».",
            "«Activar sonido» al empezar el turno, para oír los pedidos nuevos.",
        ],
        capturas=[
            ("07-cocina-nuevo", "Comanda nueva en cocina", False, [(29, 15), (32, 42), (27.7, 64), (79.6, 15)]),
        ],
        consejo="El borde de cada comanda pasa a ámbar a los 10 minutos y a rojo a los 20. El pedido no está listo hasta que cocina y barra terminan su parte.",
    ),
    dict(
        id="servir", rol="sala", titulo="Sala lo sirve en mesa", donde="Hoy · Salón",
        intro="Cuando hay platos listos, la mesa sale en «Atender ya» y con un punto verde en el plano.",
        acciones=[
            "En Hoy, «Servido» en la fila de la mesa al llevar los platos.",
            "O en el Salón: toca la mesa y «Servir 3 platos listos».",
        ],
        capturas=[
            ("12-hoy-platos-listos", "Atender ya: platos listos para servir", False, [(40.6, 55)]),
            ("14-salon-mesa-servir", "La mesa en el Salón, con sus acciones", False, [(48.8, 60)]),
            ("15-cliente-servido", "El cliente ve «Entregado»", True, []),
        ],
    ),
    dict(
        id="tpv", rol="sala", titulo="Si piden al camarero", donde="TPV",
        intro="No todo el mundo usa el QR. La comanda tomada a mano entra en cocina y barra igual que la del cliente.",
        acciones=[
            "En «Para», elige la mesa (las ocupadas salen primero) o la barra.",
            "Toca los productos; ajusta cantidades, notas, invitaciones y descuento.",
            "«Enviar a cocina».",
        ],
        capturas=[("13-tpv-comanda", "Comanda para la mesa T3", False, [(84, 20), (27, 47), (71, 73)])],
    ),
    dict(
        id="cuenta", rol="cliente", titulo="El cliente pide la cuenta", donde="Cuenta (móvil) · Hoy",
        intro="Desde el móvil ve todo lo consumido por la mesa y avisa con un toque. El botón se bloquea para no repetir el aviso.",
        acciones=[
            "«Pedir la cuenta» en el móvil.",
            "En Hoy aparece «Pide la cuenta» con el importe y el botón «Cobrar».",
        ],
        capturas=[
            ("17-cliente-cuenta-pedida", "Cuenta pedida desde la mesa", True, [(50, 96)]),
            ("18-hoy-pide-cuenta", "Hoy: la Mesa 1 pide la cuenta", False, [(36, 46.7)]),
        ],
    ),
    dict(
        id="cobrar", rol="sala", titulo="Cobrar", donde="Salón → mesa → Cobrar",
        intro="«Cobrar» abre la mesa en el Salón con el consumo y lo pendiente. «Cuenta» imprime el ticket si lo quieren en papel.",
        acciones=[
            "Si pagan a partes iguales, elige entre cuántos y se cobra parte a parte.",
            "En efectivo, toca el billete entregado…",
            "…y el sistema calcula el cambio.",
            "Efectivo o Tarjeta para registrar el cobro.",
        ],
        capturas=[
            ("19-salon-mesa-cobrar", "La mesa abierta desde «Cobrar»", False, []),
            ("20-cobro", "Ventana de cobro", False, [(57.5, 43), (57, 52.8), (43.3, 61.3), (32.8, 69.3)]),
        ],
    ),
    dict(
        id="liberar", rol="sala", titulo="Liberar y limpiar la mesa", donde="Hoy → Atender ya",
        intro="Con todo cobrado la mesa sigue abierta: pueden quedarse de sobremesa.",
        acciones=[
            "Cuando se vayan, «Liberar» en la fila «Pagada».",
            "Pasa a «Por limpiar». Al recogerla, «Limpia»: vuelve a estar libre en el plano.",
        ],
        capturas=[
            ("21-hoy-pagada", "Mesa pagada, pendiente de liberar", False, []),
            ("21-hoy-por-limpiar", "Mesa por limpiar", False, []),
        ],
    ),
    dict(
        id="caja", rol="encargado", titulo="Cierre de caja", donde="Cierre de caja",
        intro="Al terminar el turno se compara el efectivo que debería haber con el contado.",
        acciones=[
            "Revisa ventas, cobros por método y lo pendiente de cobro (debe quedar a cero; si no, mira «Fin de servicio» en el Salón).",
            "Indica el fondo de caja y cuenta el efectivo, por billetes y monedas o el total.",
            "Comprueba el descuadre y cierra. El cierre queda en el historial y se puede imprimir.",
        ],
        capturas=[("22-cierre-caja", "Arqueo cuadrado, listo para cerrar", False, [])],
    ),
]

# Mapa del recorrido: columnas = momentos, filas = roles.
RECORRIDO = [
    ("Escanea", "cliente", "escanear"),
    ("Pide", "cliente", "pedir"),
    ("Recibe", "sala", "recibir"),
    ("Prepara", "cocina", "cocina"),
    ("Sirve", "sala", "servir"),
    ("Pide la cuenta", "cliente", "cuenta"),
    ("Cobra", "sala", "cobrar"),
    ("Libera", "sala", "liberar"),
    ("Cierra caja", "encargado", "caja"),
]

ESTADOS = [
    ("Recibido", "Ha llegado; nadie lo ha aceptado aún.", "var(--terracota)"),
    ("Aceptado", "Cocina o barra lo ha visto.", "var(--marino)"),
    ("En preparación", "Se está haciendo.", "var(--ratan)"),
    ("¡Listo!", "Para servir: sale en «Atender ya».", "var(--oliva)"),
    ("Entregado", "Servido en mesa.", "var(--gris)"),
]

MESAS = [
    ("#56653A", "Libre"),
    ("#96442B", "Ocupada"),
    ("#1E3557", "Reservada"),
    ("#8E7CF0", "Pide la cuenta"),
    ("#D2AE78", "Por limpiar"),
    ("#1F9D74", "Platos listos (punto verde)"),
]

FAQ = [
    ("La pantalla de cocina no suena", "Toca «Activar sonido» al empezar el turno. El navegador no deja sonar sin un primer toque."),
    ("Un QR no funciona o se ha filtrado", "Mesas y QR → la mesa → «Regenerar». Imprime el nuevo; el antiguo deja de valer."),
    ("Ya han pagado pero la mesa sigue ocupada", "Es a propósito, por si siguen sentados. Al irse, «Liberar» en Hoy."),
    ("Quieren pagar a partes", "En «Cobrar», elige entre cuántos se divide y cobra cada parte."),
    ("Se ha acabado un plato", "Carta → «Agotado». Desaparece al momento del QR y de la web."),
    ("Un pedido está mal", "En Cocina y barra, la X de la comanda la cancela. Vuelve a tomarla bien desde el TPV."),
    ("Al cerrar caja hay pedidos sin cobrar", "Salón → «Fin de servicio» enseña qué mesas siguen abiertas."),
    ("No sé qué hace una pantalla", "Toca la «i» de arriba a la derecha: explica esa pantalla, sus colores y trucos."),
]


def e(t: str) -> str:
    return html.escape(t, quote=True)


def captura(img: str, pie: str, movil: bool, marcas: list[tuple[float, float]], desde: int = 1) -> str:
    puntos = "".join(f'<span class="marca" style="left:{x}%;top:{y}%">{i}</span>' for i, (x, y) in enumerate(marcas, desde))
    if movil:
        marco = f'<div class="movil"><img src="capturas/{img}.webp" alt="{e(pie)}">{puntos}</div>'
    else:
        marco = (
            '<div class="tablet"><div class="tablet-barra"><i></i><i></i><i></i></div>'
            f'<div class="tablet-pantalla"><img src="capturas/{img}.webp" alt="{e(pie)}">{puntos}</div></div>'
        )
    return f'<figure class="cap {"cap-movil" if movil else "cap-tablet"}">{marco}<figcaption>{e(pie)}</figcaption></figure>'


def paso(n: int, p: dict) -> str:
    rol, clase = ROLES[p["rol"]]
    con_marcas = any(c[3] for c in p["capturas"])
    acciones = "".join(f"<li>{e(a)}</li>" for a in p["acciones"])
    lista = f'<ol class="acciones {"numeradas" if con_marcas else "simples"}">{acciones}</ol>'
    consejo = f'<p class="consejo"><b>Bueno saber</b>{e(p["consejo"])}</p>' if p.get("consejo") else ""
    # Los marcadores siguen la numeración de las acciones a través de todas las capturas del paso.
    # Con capturas de móvil y de tablet a la vez, las de móvil van bajo el texto para no dejar huecos.
    mixto = len({c[2] for c in p["capturas"]}) == 2
    caps, laterales, desde = "", "", 1
    for c in p["capturas"]:
        h = captura(*c, desde=desde)
        desde += len(c[3])
        if mixto and c[2]:
            laterales += h
        else:
            caps += h
    if laterales:
        laterales = f'<div class="caps-laterales">{laterales}</div>'
    num = f'<span class="paso-num">{n:02d}</span>' if n else '<span class="paso-num paso-num-0">Antes</span>'
    return f"""
<section class="paso rol-{clase}" id="{p['id']}">
  <header class="paso-cab">
    {num}
    <div class="paso-tit">
      <p class="paso-meta"><span class="rol">{e(rol)}</span><span class="donde">{e(p['donde'])}</span></p>
      <h2>{e(p['titulo'])}</h2>
    </div>
  </header>
  <div class="paso-cuerpo{" mixto" if laterales else ""}">
    <div class="paso-texto">
      <p class="intro">{e(p['intro'])}</p>
      {lista}
      {consejo}
      {laterales}
    </div>
    <div class="paso-caps n{len(p['capturas']) - (1 if laterales else 0)}">{caps}</div>
  </div>
</section>"""


def recorrido() -> str:
    filas = []
    for clave, (rol, clase) in ROLES.items():
        celdas = "".join(
            f'<a class="nodo rol-{clase}" href="#{ancla}"><b>{i}</b>{e(t)}</a>' if r == clave else '<span class="vacio"></span>'
            for i, (t, r, ancla) in enumerate(RECORRIDO, 1)
        )
        filas.append(f'<div class="carril rol-{clase}"><span class="carril-rol">{e(rol)}</span>{celdas}</div>')
    return "".join(filas)


CSS = """
/* Manual de servicio de La Ofi: documento de operaciones con la identidad del local.
   Portada noche + neón, carriles por rol, pasos con capturas enmarcadas y marcadores. */
:root{
  --crema:#FAF5EC; --arena:#F1E8D8; --arena-2:#E6D8BF; --papel:#FFFDF8;
  --tinta:#2B2722; --tinta-2:#5E554B; --linea:rgb(43 39 34 / .14);
  --marino:#1E3557; --noche:#0B1424; --noche-2:#111E33; --neon:#C9BBFF;
  --terracota:#96442B; --oliva:#56653A; --ratan:#D2AE78; --gris:#8A8178;
  --cli:#8E7CF0; --coc:#96442B; --sal:#56653A; --enc:#1E3557;
  --bg:var(--crema); --fg:var(--tinta); --fg-2:var(--tinta-2); --sup:var(--papel); --sup-2:var(--arena);
  --display:"Fraunces", Georgia, "Times New Roman", serif;
  --texto:"Figtree", "Segoe UI", system-ui, sans-serif;
  --mono:"JetBrains Mono", ui-monospace, "Cascadia Mono", Consolas, monospace;
}
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){
  --bg:#0E1726; --fg:#F1EBE0; --fg-2:#B9B0A4; --sup:#142136; --sup-2:#1A2944; --linea:rgb(250 245 236 / .14);
  --enc:#8FA8D6; --sal:#9DB176; --coc:#D9876B; color-scheme:dark } }
:root[data-theme="dark"]{
  --bg:#0E1726; --fg:#F1EBE0; --fg-2:#B9B0A4; --sup:#142136; --sup-2:#1A2944; --linea:rgb(250 245 236 / .14);
  --enc:#8FA8D6; --sal:#9DB176; --coc:#D9876B; color-scheme:dark }

*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:400 16px/1.6 var(--texto);-webkit-font-smoothing:antialiased}
.hoja{max-width:1120px;margin:0 auto;padding-inline:clamp(16px,4vw,40px);padding-block:0 64px}
h1,h2,h3{font-family:var(--display);font-weight:500;text-wrap:balance;margin:0;letter-spacing:-.01em}
a{color:inherit}
.eyebrow{font:600 .72rem/1 var(--texto);letter-spacing:.2em;text-transform:uppercase}

/* Portada */
.portada{background:var(--noche);color:#F1EBE0;border-radius:0 0 28px 28px;margin-inline:calc(-1 * clamp(16px,4vw,40px));padding:clamp(40px,7vw,88px) clamp(16px,4vw,40px) clamp(32px,5vw,56px);position:relative;overflow:hidden}
.portada::before{content:"";position:absolute;inset:0;background:
  radial-gradient(60% 80% at 85% 0%, rgb(201 187 255 / .18), transparent 60%),
  repeating-linear-gradient(60deg, transparent 0 38px, rgb(250 245 236 / .03) 38px 39px),
  repeating-linear-gradient(-60deg, transparent 0 38px, rgb(250 245 236 / .03) 38px 39px)}
.portada > *{position:relative}
.marca-ofi{font:500 clamp(2.6rem,6vw,4rem)/1 var(--display);color:#EDE6FF;text-shadow:0 0 12px rgb(201 187 255 / .9),0 0 32px rgb(142 124 240 / .6)}
.portada .eyebrow{color:rgb(241 235 224 / .6);margin-top:10px}
.portada h1{font-size:clamp(2.2rem,5.4vw,4.2rem);line-height:1.04;margin-top:clamp(36px,6vw,64px);max-width:14ch}
.portada h1 em{font-style:italic;color:var(--neon)}
.portada .bajada{max-width:58ch;color:rgb(241 235 224 / .75);font-size:1.08rem;margin:18px 0 0}
.portada-datos{display:flex;flex-wrap:wrap;gap:10px 28px;margin-top:36px;padding-top:20px;border-top:1px solid rgb(250 245 236 / .14);font-size:.85rem;color:rgb(241 235 224 / .65)}
.portada-datos b{display:block;color:#F1EBE0;font-weight:600}

/* Bloques de cabecera de sección */
.bloque{margin-top:clamp(40px,6vw,72px)}
.bloque > .eyebrow{color:var(--terracota)}
.bloque > h2{font-size:clamp(1.7rem,3.4vw,2.4rem);margin-top:8px}
.bloque > p{max-width:65ch;color:var(--fg-2);margin:10px 0 0}

/* Roles */
.roles{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:22px}
.rol-card{background:var(--sup);border:1px solid var(--linea);border-radius:18px;padding:16px 18px;border-top:4px solid var(--c)}
.rol-card h3{font-size:1.15rem}
.rol-card p{margin:6px 0 0;font-size:.9rem;color:var(--fg-2)}
.rol-cli{--c:var(--cli)} .rol-coc{--c:var(--coc)} .rol-sal{--c:var(--sal)} .rol-enc{--c:var(--enc)}

/* Mapa del recorrido (carriles) */
.mapa{margin-top:22px;overflow-x:auto;background:var(--sup);border:1px solid var(--linea);border-radius:20px;padding:18px}
.mapa-int{min-width:820px;display:grid;gap:8px;position:relative}
.carril{display:grid;grid-template-columns:120px repeat(9,1fr);gap:6px;align-items:center;min-height:52px;border-radius:12px;background:color-mix(in srgb, var(--c) 7%, transparent)}
.carril-rol{font:600 .72rem/1.2 var(--texto);letter-spacing:.14em;text-transform:uppercase;color:var(--c);padding-left:12px}
.nodo{display:flex;flex-direction:column;gap:2px;text-decoration:none;background:var(--c);color:#fff;border-radius:10px;padding:7px 9px;font-size:.78rem;font-weight:600;line-height:1.2;box-shadow:0 1px 2px rgb(0 0 0 / .12)}
.nodo b{font:500 1.05rem/1 var(--display)}
.nodo:hover,.nodo:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
.rol-cli .nodo,.nodo.rol-cli{color:#fff}
.mapa-nota{font-size:.82rem;color:var(--fg-2);margin:12px 2px 0}

/* Ayuda en el panel */
.ayuda{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:28px;align-items:center;margin-top:22px;background:var(--sup);border:1px solid var(--linea);border-radius:22px;padding:clamp(18px,3vw,28px)}
.ayuda p{margin:0 0 10px;max-width:52ch}
.boton-i{display:inline-grid;place-items:center;width:1.7em;height:1.7em;border:1.5px solid currentColor;border-radius:.45em;font:700 .8em/1 var(--display);vertical-align:-.25em;margin-inline:2px}

/* Pasos */
.paso{margin-top:clamp(36px,5vw,56px);padding-top:clamp(24px,3vw,32px);border-top:1px solid var(--linea);scroll-margin-top:16px}
.paso-cab{display:flex;gap:18px;align-items:flex-end}
.paso-num{font:400 clamp(3rem,7vw,4.6rem)/.8 var(--display);color:var(--c);font-variant-numeric:lining-nums tabular-nums;min-width:1.25em}
.paso-num-0{font-size:clamp(1.6rem,3.4vw,2.2rem);font-style:italic;min-width:auto}
.paso-tit{min-width:0}
.paso-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 6px}
.rol{background:var(--c);color:#fff;font:600 .7rem/1 var(--texto);letter-spacing:.12em;text-transform:uppercase;padding:6px 9px;border-radius:999px}
.donde{font:500 .78rem/1.2 var(--mono);color:var(--fg-2)}
.paso h2{font-size:clamp(1.5rem,3vw,2.1rem)}
.paso-cuerpo{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.6fr);gap:clamp(20px,3vw,36px);margin-top:20px;align-items:start}
.paso-texto{min-width:0}
.intro{margin:0;font-size:1.04rem}
.acciones{list-style:none;padding:0;margin:16px 0 0;display:grid;gap:10px;counter-reset:a}
.acciones li{counter-increment:a;display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px;font-size:.95rem}
.acciones li::before{content:counter(a);display:grid;place-items:center;width:26px;height:26px;border-radius:50%;font:700 .8rem/1 var(--texto);background:var(--sup-2);color:var(--fg)}
.acciones.numeradas li::before{background:var(--c);color:#fff;box-shadow:0 0 0 3px color-mix(in srgb, var(--c) 25%, transparent)}
.consejo{margin:18px 0 0;padding:12px 14px;border-radius:14px;background:var(--sup-2);font-size:.9rem}
.consejo b{display:block;font:600 .7rem/1 var(--texto);letter-spacing:.16em;text-transform:uppercase;color:var(--c);margin-bottom:6px}

/* Capturas en marco */
.caps-laterales{display:flex;gap:16px;margin-top:22px}
.caps-laterales .cap-movil{flex:0 1 220px}
.paso-caps{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start;min-width:0}
.cap{margin:0;min-width:0}
.cap-tablet{flex:1 1 100%}
.paso-caps.n2 .cap-tablet,.paso-caps.n3 .cap-tablet{flex:1 1 100%}
.cap-movil{flex:0 1 210px}
.paso-caps.n1 .cap-movil{flex-basis:250px}
.cap figcaption{font-size:.8rem;color:var(--fg-2);margin-top:8px}
.tablet{background:#1B1F26;border-radius:16px;padding:6px 6px 8px;box-shadow:0 18px 40px -22px rgb(11 20 36 / .55)}
.tablet-barra{display:flex;gap:5px;padding:4px 6px 7px}
.tablet-barra i{width:8px;height:8px;border-radius:50%;background:#3A404C}
.tablet-pantalla,.movil{position:relative;line-height:0}
.tablet-pantalla img{width:100%;border-radius:8px;display:block}
.movil{border:7px solid #1B1F26;border-radius:30px;overflow:hidden;background:#1B1F26;box-shadow:0 18px 40px -22px rgb(11 20 36 / .55);max-width:100%}
.movil img{width:100%;display:block;border-radius:22px}
.marca{position:absolute;transform:translate(-50%,-50%);width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font:700 .78rem/1 var(--texto);color:#fff;background:var(--c);box-shadow:0 0 0 3px #fff,0 4px 10px rgb(0 0 0 / .35)}

/* Chuleta */
.chuleta{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-top:22px}
.ficha{background:var(--sup);border:1px solid var(--linea);border-radius:20px;padding:18px 20px}
.ficha h3{font-size:1.2rem;margin-bottom:12px}
.estados{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.estados li{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 10px;align-items:center;font-size:.9rem}
.estados li span{grid-row:span 2;width:12px;height:36px;border-radius:6px}
.estados li b{font-weight:600}
.estados li em{font-style:normal;color:var(--fg-2);font-size:.84rem}
.colores{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:10px 14px;font-size:.9rem}
.colores li{display:flex;gap:9px;align-items:center}
.colores i{width:22px;height:22px;border-radius:7px;flex:none}
.faq{margin-top:22px;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:0 28px}
.faq div{padding:14px 0;border-bottom:1px solid var(--linea)}
.faq dt{font-weight:600}
.faq dd{margin:4px 0 0;color:var(--fg-2);font-size:.92rem}
.pie{margin-top:56px;padding-top:18px;border-top:1px solid var(--linea);font-size:.8rem;color:var(--fg-2);display:flex;flex-wrap:wrap;gap:8px 24px;justify-content:space-between}

@media (max-width:760px){
  .paso-cuerpo,.ayuda{grid-template-columns:minmax(0,1fr)}
  .cap-movil,.paso-caps.n1 .cap-movil{flex:1 1 160px;max-width:260px}
}
@media (prefers-reduced-motion:no-preference){ .nodo{transition:transform .15s ease} .nodo:hover{transform:translateY(-2px)} }

/* Impresión / PDF A4: siempre en claro, cada paso entero en su página si cabe. */
@page{size:A4;margin:12mm 12mm 14mm}
@media print{
  :root,:root[data-theme="dark"]{--bg:#fff;--fg:#2B2722;--fg-2:#5E554B;--sup:#FFFDF8;--sup-2:#F1E8D8;--linea:rgb(43 39 34 / .16);--enc:#1E3557;--sal:#56653A;--coc:#96442B;color-scheme:light}
  body{font-size:10.5pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .hoja{max-width:none;padding:0}
  .portada{margin:0;min-height:270mm;display:flex;flex-direction:column;justify-content:flex-end;break-after:page;border-radius:0}
  .bloque,.paso{break-inside:avoid}
  .paso{break-before:page;margin-top:0;border-top:0;padding-top:0}
  /* Una columna con capturas grandes; dos solo si el paso mezcla móvil (junto al texto) y tablet. */
  .paso-cuerpo{grid-template-columns:minmax(0,1fr);gap:7mm;margin-top:6mm}
  .paso-cuerpo.mixto{grid-template-columns:minmax(0,.8fr) minmax(0,1.5fr)}
  .paso-texto .intro,.acciones,.consejo{max-width:150mm}
  .paso-cuerpo:not(.mixto) .paso-texto{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0 8mm;align-items:start}
  .paso-cuerpo:not(.mixto) .intro{grid-column:1/-1}
  .paso-cuerpo:not(.mixto) .consejo{margin-top:16px}
  .paso-caps{justify-content:center;gap:6mm}
  .paso-caps.n1 .cap-tablet{flex:0 1 100%}
  .paso-caps.n2 .cap-tablet,.paso-caps.n3 .cap-tablet{flex:0 1 68%}
  .cap{break-inside:avoid}
  .paso-cuerpo.mixto .paso-caps .cap-tablet{flex:1 1 100%}
  .cap-movil,.paso-caps.n1 .cap-movil{flex:0 1 62mm}
  .caps-laterales .cap-movil{flex:0 1 52mm}
  .roles{grid-template-columns:repeat(4,minmax(0,1fr))}
  .pie{display:none}
  .chuleta-bloque{break-before:page}
  .mapa{overflow:visible}.mapa-int{min-width:0}
  .tablet,.movil{box-shadow:none}
}
"""


def documento() -> str:
    pasos = "".join(paso(i, p) for i, p in enumerate(PASOS))
    roles = "".join(
        f'<div class="rol-card rol-{c}"><h3>{e(n)}</h3><p>{e(t)}</p></div>'
        for n, c, t in [
            ("Cliente", "cli", "Pide y sigue su pedido desde el móvil con el QR de su mesa. No instala nada."),
            ("Cocina y barra", "coc", "Recibe las comandas en su pantalla y las marca como aceptadas, en preparación y listas."),
            ("Sala", "sal", "Atiende avisos, sirve lo que está listo, toma comandas en el TPV y cobra."),
            ("Encargado/a", "enc", "Prepara mesas y QR, mantiene la carta y cierra la caja al final del turno."),
        ]
    )
    estados = "".join(f'<li><span style="background:{c}"></span><b>{e(n)}</b><em>{e(t)}</em></li>' for n, t, c in ESTADOS)
    colores = "".join(f'<li><i style="background:{c}"></i>{e(t)}</li>' for c, t in MESAS)
    faq = "".join(f"<div><dt>{e(q)}</dt><dd>{e(a)}</dd></div>" for q, a in FAQ)
    return f"""<title>Manual de servicio La Ofi</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap">
<style>{CSS}</style>
<main class="hoja">
  <header class="portada">
    <p class="marca-ofi">la ofi</p>
    <p class="eyebrow">Manual de servicio · Equipo</p>
    <h1>Un pedido, <em>del QR</em> al cierre de caja</h1>
    <p class="bajada">Qué hace cada persona en cada momento del servicio: el cliente desde su móvil, cocina y barra en su pantalla, sala en el plano y el TPV, y el encargado al cerrar. Todas las capturas son del sistema real.</p>
    <div class="portada-datos">
      <span><b>Para</b>Sala, cocina, barra y encargados</span>
      <span><b>Recorrido</b>Preparación y 11 pasos · Mesa 1, pedido de 14,90 €</span>
      <span><b>Edición</b>Octubre 2026</span>
    </div>
  </header>

  <section class="bloque" aria-labelledby="quien">
    <p class="eyebrow">Quién hace qué</p>
    <h2 id="quien">Cuatro papeles, un mismo pedido</h2>
    <p>Cada paso del manual lleva el color de quien lo hace. El mismo código de colores se usa en el mapa de abajo.</p>
    <div class="roles">{roles}</div>
  </section>

  <section class="bloque" aria-labelledby="mapa">
    <p class="eyebrow">El recorrido</p>
    <h2 id="mapa">De la mesa a la caja en nueve momentos</h2>
    <p>Cada recuadro lleva a su paso. La línea temporal avanza de izquierda a derecha y cambia de carril cuando cambia quien actúa.</p>
    <div class="mapa"><div class="mapa-int">{recorrido()}</div></div>
    <p class="mapa-nota">Si alguien prefiere pedir al camarero, sala toma la comanda en el TPV y el pedido sigue igual desde «Prepara».</p>
  </section>

  <section class="bloque" aria-labelledby="ayuda">
    <p class="eyebrow">Ayuda en el panel</p>
    <h2 id="ayuda">La <span class="boton-i">i</span> explica cada pantalla</h2>
    <div class="ayuda">
      <div>
        <p>Arriba a la derecha de cualquier pantalla del panel hay un botón <span class="boton-i">i</span>. Abre una explicación de esa pantalla: para qué sirve, cómo se usa paso a paso, qué significan sus colores y algunos trucos.</p>
        <p>Un punto rojo en la <span class="boton-i">i</span> indica que todavía no has abierto la ayuda de esa pantalla en ese dispositivo.</p>
      </div>
      {captura("23-ayuda-salon", "Ayuda del Salón", False, [])}
    </div>
  </section>

  {pasos}

  <section class="bloque chuleta-bloque" aria-labelledby="chuleta">
    <p class="eyebrow">Chuleta</p>
    <h2 id="chuleta">Para tener a mano</h2>
    <div class="chuleta">
      <div class="ficha"><h3>Estados de un pedido</h3><ul class="estados">{estados}</ul></div>
      <div class="ficha"><h3>Colores de las mesas</h3><ul class="colores">{colores}</ul></div>
    </div>
    <h3 style="margin-top:32px;font-size:1.4rem">Qué hago si…</h3>
    <dl class="faq">{faq}</dl>
  </section>

  <footer class="pie">
    <span>La Ofi · Restaurante en el Parque Tecnológico de Bizkaia, Derio</span>
    <span>Capturas del sistema con datos de prueba</span>
  </footer>
</main>
"""


def main() -> None:
    cuerpo = documento()
    completo = (
        '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        + cuerpo.replace("<main", "</head>\n<body>\n<main", 1)
        + "</body>\n</html>\n"
    )
    (DOCS / "manual-pedidos.html").write_text(completo, encoding="utf-8")
    if len(sys.argv) > 1:
        Path(sys.argv[1], "manual-fragmento.html").write_text(cuerpo, encoding="utf-8")
    print("ok")


if __name__ == "__main__":
    main()
