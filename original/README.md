# Mi puesto · Registro de ventas y stock

Aplicación web para registrar ventas en un puesto ambulante desde el celular. Se ingresa el SKU del producto, se descuenta del stock y la venta queda guardada con fecha, hora y ubicación GPS. Opcionalmente, cada venta se envía sola a una planilla de Google Sheets.

Está hecha solo con **HTML, CSS y JavaScript**, sin frameworks ni servidor propio.

## Características

- **Venta en segundos:** campo de SKU grande, selector de cantidad y un botón. Funciona con teclado y con lectores de código de barras que simulan teclado (terminan con Enter).
- **Control de stock por SKU:** descuenta al vender, bloquea ventas sin stock suficiente y marca los productos con poco stock (3 o menos) y agotados.
- **Registro automático:** cada venta guarda fecha, hora, coordenadas y precisión del GPS. Si el GPS falla o se niega el permiso, la venta se guarda igual.
- **Deshacer:** revierte la última venta (devuelve el stock y la quita del historial y de la planilla).
- **Historial y totales:** ventas de hoy o históricas, con unidades, total y enlace al mapa.
- **Planillas Excel:** importa productos desde `.xlsx` o `.csv` y exporta productos y ventas a `.xlsx`.
- **Sincronización con Google Sheets (opcional):** envía ventas, anulaciones y stock a una hoja de cálculo mediante Google Apps Script. Si no hay internet, los movimientos quedan en cola y se envían al volver la conexión. Si un envío falla, la venta **no se pierde**: sigue en la cola y Ajustes avisa que no se pudo sincronizar.
- **Datos locales:** todo se guarda en el navegador (`localStorage`), por lo que se puede seguir vendiendo sin conexión una vez cargada la página.

## Estructura del proyecto

```
.
├── index.html            Estructura y textos de la interfaz
├── styles.css            Diseño (mobile first, alto contraste)
├── app.js                Lógica: ventas, stock, GPS, planillas y sincronización
├── Code.gs               Google Apps Script que recibe los datos (se pega en Google, no se publica)
├── planilla-puesto.xlsx  Planilla modelo (Instrucciones, Productos, Ventas, Resumen)
└── README.md
```

`index.html`, `styles.css` y `app.js` deben estar en la misma carpeta. `Code.gs` y la planilla no forman parte del sitio.

## Inicio rápido

1. Descargá todos los archivos en una misma carpeta.
2. Abrí `index.html` en el navegador.
3. En la pestaña **Stock**, tocá **Cargar 3 de ejemplo** o agregá tus productos.
4. En **Vender**, escribí un SKU y registrá una venta.

Para usarla en el celular con GPS, publicala con HTTPS (ver [Publicación](#publicación)).

## Publicación

El navegador solo entrega la ubicación en páginas servidas por **HTTPS**. Opciones gratuitas:

- **GitHub Pages:** creá un repositorio, subí `index.html`, `styles.css` y `app.js`, y activá Pages en *Settings > Pages*.
- **Netlify:** arrastrá la carpeta a [app.netlify.com/drop](https://app.netlify.com/drop).

No subas `Code.gs` ni tu planilla al repositorio.

Luego abrí la URL en el celular y usá **Añadir a pantalla de inicio** para tener un acceso directo.

## Conexión con Google Sheets

Es opcional. Sin ella la app funciona igual y guarda todo en el celular.

### 1. Preparar la planilla

1. Subí `planilla-puesto.xlsx` a Google Drive.
2. Abrila con Google Sheets y elegí **Archivo > Guardar como Hoja de cálculo de Google**.
3. En las hojas **Productos** y **Ventas**, borrá el contenido de la fila 2 (es un ejemplo con SKU `EJEMPLO-001`). Seleccioná las celdas y presioná Supr, sin eliminar la fila.

### 2. Instalar el script

1. En la hoja, abrí **Extensiones > Apps Script**.
2. Borrá el contenido y pegá `Code.gs` completo.
3. En la línea 18, reemplazá `CAMBIA-ESTA-CLAVE` por una frase propia:
   ```js
   const CLAVE = 'tu-frase-secreta';
   ```
4. Elegí la función `preparar` y tocá **Ejecutar**. Aceptá los permisos.
5. Tocá **Implementar > Nueva implementación > Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
6. Copiá la URL de la aplicación web (termina en `/exec`).

### 3. Conectar la app

En **Ajustes > Google Sheets** pegá la URL y escribí la misma clave. Tocá **Probar conexión**: debe aparecer *Conectado con tu planilla*.

> Si modificás `Code.gs` más adelante, hacé una **nueva implementación** para que el cambio se aplique. La URL puede cambiar y habrá que actualizarla en Ajustes.

## Flujo de datos

| Acción en la app | Qué pasa en Google Sheets |
|---|---|
| Registrar una venta | Se agrega una fila en **Ventas** y se actualiza el stock en **Productos** |
| Deshacer una venta | Se borra la fila de esa venta (por ID) y se corrige el stock |
| Subir productos | Se reemplaza el contenido de **Productos** con el de la app |
| Traer productos | Se agregan o actualizan en la app los productos de la hoja |

La venta se envía cuando el GPS responde o vence su tiempo de espera (15 segundos), de modo que incluya la ubicación. Sin conexión, queda en cola y se reintenta al volver a estar en línea.

## La planilla modelo

| Hoja | Contenido |
|---|---|
| **Instrucciones** | Guía de uso dentro del propio archivo |
| **Productos** | `SKU`, `Producto`, `Precio`, `Stock` |
| **Ventas** | `Fecha`, `Hora`, `SKU`, `Producto`, `Cantidad`, `Precio`, `Total`, `Latitud`, `Longitud` (y `ID`, que agrega el script) |
| **Resumen** | Total vendido, unidades, cantidad de ventas, promedio por venta y detalle por producto (hasta 100) |

El **Resumen** se calcula con fórmulas. No hay que escribir en esa hoja.

### Uso sin Google Sheets

Podés trabajar solo con archivos: en **Stock > Exportar planilla** se descarga un `.xlsx` con Productos y Ventas, y con **Importar planilla** se cargan o actualizan productos. Al importar, los SKU que ya existen actualizan nombre, precio y stock, los nuevos se agregan y nunca se elimina nada. Los SKU que empiezan con `EJEMPLO` se ignoran.

## Modelo de datos

Todo vive en `localStorage` bajo la clave `puestoVentas.v1`.

```js
// Producto
{ sku: 'MAC-001', nombre: 'Maceta chica', precio: 250, stock: 12 }

// Venta
{ id: 1759570000000, ts: '2026-10-04T13:32:15.000Z', sku: 'MAC-001', nombre: 'Maceta chica',
  qty: 2, precio: 250, total: 500, lat: -34.905, lng: -56.191, acc: 12 }
```

## Protocolo con Apps Script

El script expone una aplicación web con dos puntos de entrada. Todas las solicitudes llevan la clave y se rechazan si no coincide.

- `GET <url>?clave=...` devuelve `{ ok, productos: [...] }`. La app lo usa para **Probar conexión** y **Traer productos**.
- `POST <url>` con cuerpo JSON en `text/plain` (evita la verificación previa CORS). Tipos de mensaje:
  - `venta`: `id, fecha, hora, sku, producto, cantidad, precio, total, lat, lng, stock`
  - `anular`: `id, sku, stock`
  - `productos`: `productos: [{ sku, nombre, precio, stock }]`

El script usa un bloqueo (`LockService`) para evitar filas superpuestas si llegan varias ventas a la vez.

## Seguridad y privacidad

- La **clave y la URL son la única protección** de tu planilla, porque la aplicación web se publica con acceso "Cualquier persona". No las compartas ni las subas a un repositorio público.
- La app guarda la URL y la clave en el navegador (Ajustes), no en el código, para que no viajen con los archivos publicados.
- La clave se envía en cada solicitud. Para un negocio chico es razonable; para datos sensibles conviene un backend con autenticación real.
- Las coordenadas de cada venta se guardan en el dispositivo y, si conectaste Google Sheets, también en tu planilla.

## Limitaciones conocidas

- **Respuesta de envío no verificable:** por la política CORS de Google, la app no puede leer la respuesta de los envíos. **Probar conexión** valida la URL y la clave. Si algo falla después, revisá la hoja Ventas.
- **Datos en el navegador:** borrar los datos del sitio elimina el historial local. Exportá la planilla seguido o usá la sincronización con Google Sheets.
- **Un solo dispositivo como fuente de stock:** el stock vive en cada navegador. Si vendés desde dos celulares a la vez, el stock puede desfasarse. Usá un solo dispositivo por puesto o corregí con **Traer productos**.
- **Sin modo offline completo:** una vez cargada la página se puede vender sin internet, pero no hay un service worker que permita abrir la app desde cero sin conexión.
- **Librería de planillas:** importar y exportar `.xlsx` usa SheetJS desde cdnjs y necesita internet.
- **Tipografía:** la fuente Bricolage Grotesque se carga desde Google Fonts. Sin conexión se usa la fuente del sistema.

## Solución de problemas

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| "La clave no coincide con la del script" | La clave de Ajustes difiere de la de `Code.gs` | Compará ambas, deben ser idénticas |
| "No se pudo conectar. Revisá la URL" | URL incompleta o implementación sin acceso público | Pegá la URL completa terminada en `/exec` y verificá "Cualquier persona" |
| Las ventas no aparecen en la hoja | Falta ejecutar `preparar` o la implementación quedó desactualizada | Ejecutá `preparar` y hacé una nueva implementación |
| Ventas "Sin ubicación" | Permiso de ubicación denegado o página sin HTTPS | Habilitá la ubicación para el sitio y publicá con HTTPS |
| Botón de importar o exportar sin efecto | No se cargó SheetJS | Revisá tu conexión y recargá la página |
| La venta de prueba se suma al Resumen | Quedó la fila de ejemplo | Borrá el contenido de la fila 2 en Productos y Ventas |

## Próximos pasos posibles

- Service worker para abrir la app sin conexión.
- Medios de pago y promociones por medio de pago.
- Panel de indicadores (ventas por hora, producto más vendido, ticket promedio).
- Alerta de stock bajo dentro de la app.
