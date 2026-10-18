# Prompts para Gemini: fotos de plato de la carta

Fotos por plato para la carta de la web (desayunos y El Despacho), generadas con Gemini
(modelo de imagen, «Nano Banana») a partir de fotos reales del local para que todas
parezcan de la misma sesión y del mismo sitio.

## Cómo usarlo

1. Abre un chat nuevo de Gemini con generación de imagen.
2. **Adjunta siempre estas dos fotos de referencia** (están en el repo):
   - **Escena y vajilla:** `public/images/local/pro/despacho.webp`. Es la foto profesional de
     El Despacho: mesas de roble claro, salvamanteles de papel kraft, plato blanco redondo,
     copas de vino y luz cálida ámbar con toques azules.
   - **Estilo fotográfico:** `public/images/ia/tostada-burrata.webp`. Es la foto de plato
     que mejor funciona en la web: encuadre a 45°, fondo desenfocado y luz natural.
   - **Solo para desayunos**, cambia la primera por `public/images/pintxos/tostada-burrata.webp`
     (la foto real de Instagram: plato rectangular blanco y pan de masa madre de La Ofi).
3. Pega el **bloque base** y, debajo, la **línea del plato**. Un plato por imagen.
4. Pide 2–4 variantes y quédate con la menos «perfecta». Si sale brillo de plástico o
   demasiado humo, contesta: *«Less polished: matte natural textures, no steam, slightly
   messier plating, like a real photo taken during service.»*
5. Guarda la imagen como `carta-<plato>.png` (p. ej. `carta-carrilleras.png`) y pásamela:
   la recorto, la paso a WebP y la asigno al plato en la web.

Los prompts van en inglés porque Gemini da imágenes más fieles así.

> Son recreaciones, no fotos del plato real. **Carlos tiene que dar el visto bueno a cada
> una** (que el emplatado y la ración se parezcan a lo que sirve la cocina). Si alguna no se
> parece, mejor dejar ese plato sin foto.

## Bloque base (pegar siempre)

```text
Use the attached photos as reference: the first one for the setting and tableware (light
oak table, kraft paper placemat, plain white ceramic plate, stemmed wine glass, grey
upholstered chair, warm amber wall light with a hint of blue in the far background), the
second one for the photographic style.

Create a realistic editorial food photograph for the menu of a Basque grill restaurant
near Bilbao. Shot on a full-frame camera with a 50mm lens at f/2.8, camera at about 40°
above the table, the dish slightly off-centre, background softly out of focus. Natural
light from a window on the left mixed with the warm interior light; soft real shadows
under the plate. Colours true to life, moderate contrast, a little natural film grain.

It must look like a real photo taken during service, not a render: generous home-style
Spanish portion, slightly imperfect plating, uneven char marks from a charcoal grill,
crumbs or a drop of olive oil on the plate rim, matte textures on bread and meat. Only
the dish described, nothing added that a Basque kitchen wouldn't serve.

Avoid: plastic shine, oversaturated colours, perfect symmetry, steam clouds, smoke,
floating ingredients, decorative herbs or microgreens, edible flowers, sauce swooshes,
text, logos, hands, people, extra plates of other food, dark moody black backgrounds.
Vertical 4:5 format.
```

## Línea por plato

### Desayunos (tostadas en pan de masa madre)

Ya tienen foto real: **Burrata, Bonita, Revuelta y Salmón**. Faltan estas:

| Plato | Pegar debajo del bloque base |
|---|---|
| Clásica | `Dish: two thick slices of toasted sourdough bread on a white rectangular plate, one with crushed fresh tomato and a drizzle of olive oil, the other with butter; a small bowl of jam beside it and a café con leche in a glass cup in the background.` |
| Ibérico | `Dish: a thick slice of toasted sourdough bread rubbed with grated fresh tomato and olive oil, topped with thin hand-cut slices of Iberian ham, on a white rectangular plate.` |
| Aguacate | `Dish: a thick slice of toasted sourdough bread with chunky crushed avocado, small diced tomato and thin slices of Iberian ham draped on top, on a white rectangular plate.` |
| Americana | `Dish: a thick slice of toasted sourdough bread topped with crispy bacon strips and a fried egg with lacy crispy edges and a runny yolk, on a white rectangular plate.` |
| Bowl de yogur | `Dish: a white ceramic bowl of thick natural yogurt topped with crunchy muesli, a drizzle of honey and pieces of fresh tropical fruit (mango, pineapple, kiwi).` |

### El Despacho: entrantes

| Plato | Pegar debajo del bloque base |
|---|---|
| Cecina de Angus | `Dish: very thin slices of cured Angus beef cecina, deep red with a thin fat edge, fanned out on a white plate, drizzled with olive oil and a few flakes of salt.` |
| Tabla de ibérico | `Dish: a wooden board with hand-cut Iberian ham, chorizo, salchichón and lomo slices arranged in loose rows, with a few breadsticks (picos) on the side.` |
| Paletilla ibérica | `Dish: thin hand-carved slices of Iberian paletilla ham, glossy fat marbling, spread across a white plate in a single loose layer.` |
| Queso de la casa | `Dish: triangular wedges of cured sheep's milk cheese with natural rind, slightly irregular, on a white plate with a drizzle of olive oil.` |
| Anchoas 00 | `Dish: six large Cantabrian anchovy fillets from Santoña laid side by side on a white rectangular plate, glistening with olive oil, nothing else on the plate.` |
| Gambas al ajillo | `Dish: peeled prawns in a small terracotta cazuela, still bubbling slightly in olive oil with sliced golden garlic and a dried guindilla chilli, a piece of bread next to it.` |
| Croquetas de la casa | `Dish: five homemade ham croquetas, irregular oval shapes with a golden crunchy breadcrumb crust, one cut in half showing a creamy béchamel inside, on a white plate.` |

### El Despacho: entrantes a la brasa

| Plato | Pegar debajo del bloque base |
|---|---|
| Puerros con salsa de hongos | `Dish: whole leeks charred on a charcoal grill, split lengthwise, lying on a pool of creamy beige mushroom sauce on a white plate.` |
| Espárragos sobre mahonesa de aguacate | `Dish: thick green asparagus spears grilled over charcoal with dark char marks, laid over a smear of pale green avocado mayonnaise on a white plate.` |
| Pulpo | `Dish: a grilled octopus tentacle with crispy charred suckers on sliced boiled potatoes, dusted with smoked paprika and coarse salt, drizzled with olive oil, on a white plate.` |
| Morcilla de Burgos con pimientos asados | `Dish: thick rounds of Burgos black pudding with rice, grilled until crispy on the outside, next to strips of roasted red peppers glossy with olive oil, on a white plate.` |
| Morcilla de puerro de Zamudio | `Dish: a whole Basque leek black pudding from Zamudio, grilled over charcoal and sliced into thick pieces showing the dark filling with green leek, on a white plate.` |
| Flor de alcachofa con papada ibérica y huevo | `Dish: artichoke hearts opened like flowers and grilled, topped with thin translucent slices of Iberian pork jowl (papada) slightly melted by the heat and a soft fried egg, on a white plate.` |

### El Despacho: ensaladas

| Plato | Pegar debajo del bloque base |
|---|---|
| Ensalada de la casa | `Dish: a white bowl of mixed young salad leaves (mesclun) with a round of tomato tartare and diced avocado on top, dressed with olive oil.` |
| Ensalada de burrata | `Dish: a whole burrata, torn open in the centre, on a bed of salad leaves and tomato pieces, drizzled with olive oil, on a white plate.` |
| Ensalada de ventresca con pimientos asados | `Dish: strips of roasted red peppers topped with large flakes of bonito ventresca (tuna belly) in olive oil and thin slices of spring onion, on a white plate.` |
| Bol (lechuga y cebolla) | `Dish: a simple white bowl of crisp chopped lettuce and thin rings of onion, dressed with olive oil and vinegar.` |
| Bol (tomate, lechuga y cebolla) | `Dish: a simple white bowl of chopped lettuce, thick wedges of ripe tomato and thin rings of onion, dressed with olive oil and vinegar.` |

### El Despacho: carnes

| Plato | Pegar debajo del bloque base |
|---|---|
| Escalope milanesa | `Dish: a large thin breaded veal escalope milanesa, golden and crispy, with a lemon wedge and home-made chips, on a white plate.` |
| Carrilleras de ternera al PX | `Dish: two braised beef cheeks glazed in a dark glossy Pedro Ximénez sauce, so tender they break apart, on a smooth potato purée, on a white plate.` |
| Rabo guisado | `Dish: pieces of slow-braised oxtail in a thick dark red-wine stew sauce, meat falling off the bone, with a few chips, in a white deep plate.` |
| Costilla a baja temperatura agridulce | `Dish: a rack of slow-cooked pork ribs with a sticky sweet-and-sour glaze, slightly caramelised edges, on a white plate.` |
| Secreto ibérico a la brasa | `Dish: Iberian pork secreto grilled over charcoal, sliced into strips, juicy pink inside with crisp charred fat, coarse salt flakes, a few chips, on a white plate.` |
| Presa ibérica | `Dish: Iberian pork presa grilled and sliced, rosy pink in the centre, glistening with its juices and coarse salt, on a white plate.` |
| Entrecot a la brasa | `Dish: a thick beef entrecôte grilled over charcoal, sliced to show a medium-rare red centre, crusty charred edges, coarse salt, with roasted green peppers, on a white plate.` |
| Chuleta de ganado mayor | `Dish: a large bone-in Basque txuleta from mature beef, grilled over charcoal, sliced off the bone on a hot clay or iron plate, deep red rare centre, thick yellow fat cap with char, coarse salt flakes.` |

### El Despacho: pescados

| Plato | Pegar debajo del bloque base |
|---|---|
| Bacalao | `Dish: a thick confit cod loin with large white flakes separating, skin side up, on a white plate with a little pil-pil emulsion and olive oil.` |
| Pescado de temporada a la brasa | `Dish: a whole fish (sea bream or turbot) grilled Basque style over charcoal, crispy charred skin, opened and dressed with a sizzling garlic, oil and vinegar refrito, on a white oval platter.` |

### El Despacho: postres

| Plato | Pegar debajo del bloque base |
|---|---|
| Tarta de limón | `Dish: a slice of lemon tart with shortcrust pastry and a smooth pale yellow lemon curd, lightly torched meringue on top, on a small white plate.` |
| Pastel vasco | `Dish: a slice of traditional Basque gâteau (pastel vasco) with a golden cross-hatched crust and a thick pastry cream filling, on a small white plate.` |
| Tarta de queso | `Dish: a slice of Basque burnt cheesecake with a deeply caramelised almost black top and a creamy soft centre, on a small white plate.` |
| Arroz con leche | `Dish: a small earthenware bowl of creamy Spanish rice pudding with a caramelised sugar crust on top and a dusting of cinnamon.` |
| Helados artesanales | `Dish: two scoops of artisan ice cream (vanilla and chocolate) with a rough, hand-scooped texture in a small white bowl, slightly starting to melt.` |

### Vinos dulces (una foto para la sección)

`Dish: four small glasses of Spanish dessert wines in a row on the table, from pale gold moscatel to amber, dark mahogany Pedro Ximénez and ruby tawny port, no bottles, no labels.`
