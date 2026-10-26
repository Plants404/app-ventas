# Mi puesto · Registro de ventas y stock

Aplicación para registrar ventas en un puesto ambulante desde el celular. Se ingresa el SKU del producto, se descuenta del stock y la venta queda guardada con fecha, hora y ubicación GPS. Opcionalmente, cada venta se envía sola a una planilla de Google Sheets.

El proyecto está organizado con responsabilidades separadas en **Frontend** y **Backend** independientes.

## Tecnologías

- **Frontend:** React 19 (Vite 8), JavaScript (ES Modules), CSS reutilizado.
- **Backend:** Node.js, Express (ES Modules), modular (rutas, controladores, servicios).
- **Planillas:** SheetJS (cdnjs) para importar/exportar `.xlsx`/`.csv`.
- **Sincronización:** Google Sheets mediante Google Apps Script.

## Estructura del proyecto

```
.
├── frontend/                 Aplicación cliente (React + Vite)
│   ├── index.html            Entrada de Vite
│   ├── package.json          Scripts y dependencias del frontend
│   ├── vite.config.js        Configuración de Vite
│   ├── .oxlintrc.json        Configuración de Oxlint
│   ├── public/               Recursos estáticos (favicon, iconos)
│   └── src/
│       ├── main.jsx          Montaje de React
│       ├── App.jsx           Lógica de la aplicación
│       └── styles.css        Estilos de la interfaz
├── backend/                  API y lógica de negocio (Node.js + Express)
│   ├── package.json          Scripts y dependencias del backend
│   ├── .env.example          Plantilla de variables de entorno
│   ├── src/
│       ├── config/           Configuración y variables de entorno
│       ├── controllers/      Controladores HTTP (productos, ventas)
│       ├── middlewares/      Manejo centralizado de errores y 404
│       ├── routes/           Rutas de la API (/api/health, /api/products, /api/sales)
│       ├── services/         Lógica de negocio y persistencia
│       ├── app.js            Configuración de Express
│       └── server.js         Punto de entrada del servidor HTTP
│   └── README.md             Documentación del backend
├── original/                 Código original vanilla (HTML/CSS/JS) sin modificar
├── package.json              Configuración de workspaces (npm) y scripts globales
└── README.md
```

## Requisitos

- Node.js 18 o superior.
- npm.

## Instalación

Instala las dependencias de todos los workspaces desde la raíz:

```bash
npm install
```

## Desarrollo

### Frontend
```bash
npm run dev:frontend
```
O desde la carpeta `frontend/`:
```bash
cd frontend
npm run dev
```
Abre la URL que muestra Vite (por defecto `http://localhost:5173`).

### Backend
```bash
npm run dev:backend
```
O desde la carpeta `backend/`:
```bash
cd backend
npm run dev
```
El servidor se iniciará en `http://localhost:3000` con recarga automática.

## Producción y Verificación

### Frontend
```bash
npm run build:frontend
npm run lint:frontend
```

### Vista previa local (Show Preview)
```bash
npm run build:frontend
```
La salida queda en `dist/` (raíz del repositorio). El workspace ya apunta `livePreview.defaultPreviewPath` a `/dist/index.html`, por lo que "Show Preview" muestra la app construida. Los assets usan rutas relativas, por lo que tambièn funcionan al abrir el archivo directamente.

### GitHub Pages
Cada push a `main` ejecuta `.github/workflows/deploy.yml`, que construye el frontend y publica `dist` en GitHub Pages. Tambièn se puede lanzar manualmente desde la pestaña "Actions" (workflow_dispatch). En el repositorio, activar Pages con origen "GitHub Actions" (Settings > Pages).

### Backend
```bash
npm run start:backend
```

## Características

- Venta en segundos: campo de SKU grande, selector de cantidad y un botón. Funciona con teclado y lectores de código de barras.
- Alta de productos: propone el primer SKU disponible por tipo (MAC para plantas, ISU para insumos, KIT para kits de huerta y SID para productos sin identificar). El SKU sigue siendo editable.
- Control de stock por SKU: descuenta al vender, bloquea ventas sin stock suficiente y marca productos con poco stock (3 o menos) y agotados.
- Registro automático: fecha, hora, coordenadas y precisión del GPS.
- Deshacer: revierte la última venta.
- Historial y totales: ventas de hoy o históricas, con unidades, total y enlace al mapa.
- Planillas Excel: importa y exporta `.xlsx` o `.csv`.
- Sincronización con Google Sheets (opcional).
