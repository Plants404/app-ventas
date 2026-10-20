# Mi puesto · Registro de ventas y stock

Aplicación web para registrar ventas en un puesto ambulante desde el celular. Se ingresa el SKU del producto, se descuenta del stock y la venta queda guardada con fecha, hora y ubicación GPS. Opcionalmente, cada venta se envía sola a una planilla de Google Sheets.

Frontend migrado a **React** (Vite). El código original en HTML/CSS/JS vanilla se conserva en `original/` para referencia.

## Tecnologías

- Frontend: React (Vite), JavaScript, CSS original reutilizado.
- Backend: no aplica (la app funciona en el navegador, con `localStorage`).
- Planillas: SheetJS (cdnjs) para importar/exportar `.xlsx`/`.csv`.
- Sincronización opcional con Google Sheets mediante Google Apps Script.

## Estructura

```
.
├── index.html            Entrada de Vite
├── package.json          Scripts y dependencias
├── vite.config.js        Configuración de Vite
├── src/
│   ├── main.jsx          Montaje de React
│   ├── App.jsx           Lógica migrada a React
│   └── styles.css        Estilos originales reutilizados
├── public/               Recursos estáticos
├── original/             Código original (HTML/CSS/JS) sin modificar
└── README.md
```

## Requisitos

- Node.js 18 o superior.
- npm.

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre la URL que muestra Vite (por defecto `http://localhost:5173`).

## Producción

```bash
npm run build
npm run preview
```

Los archivos generados quedan en `dist/`.

## Lint

```bash
npm run lint
```

## Características

- Venta en segundos: campo de SKU grande, selector de cantidad y un botón. Funciona con teclado y lectores de código de barras.
- Alta de productos: propone el primer SKU disponible por tipo (MAC para plantas, ISU para insumos, KIT para kits de huerta y SID para productos sin identificar). El SKU sigue siendo editable; si Google Sheets está configurado y en línea, se consulta para evitar repetir códigos. Si no está disponible, se usa el catálogo local.
- Control de stock por SKU: descuenta al vender, bloquea ventas sin stock suficiente y marca productos con poco stock (3 o menos) y agotados.
- Registro automático: fecha, hora, coordenadas y precisión del GPS. Si el GPS falla, la venta se guarda igual.
- Deshacer: revierte la última venta.
- Historial y totales: ventas de hoy o históricas, con unidades, total y enlace al mapa.
- Planillas Excel: importa productos desde `.xlsx` o `.csv` y exporta productos y ventas a `.xlsx`.
- Sincronización con Google Sheets (opcional).
- Datos locales en `localStorage` bajo la clave `puestoVentas.v1`.

## Migración

El frontend original (`original/index.html`, `original/styles.css`, `original/app.js`) se migró a React conservando estructura del DOM, clases, estilos, textos y comportamiento. La lógica se adaptó a eventos y estado de React (`useState`, `useEffect`, `useRef`) sin alterar reglas de negocio.
