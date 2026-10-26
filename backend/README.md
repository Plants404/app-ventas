# Backend · Mi Puesto (App Ventas)

Backend modular basado en **Node.js** y **Express** (ES Modules).

> [!NOTE]
> Este backend está preparado de forma independiente y todavía no está vinculado al frontend, siguiendo la separación de responsabilidades solicitada.

## Estructura

```
backend/
├── src/
│   ├── config/             Configuración y variables de entorno
│   │   └── index.js
│   ├── controllers/        Controladores que gestionan las peticiones HTTP
│   │   ├── products.controller.js
│   │   └── sales.controller.js
│   ├── middlewares/        Middlewares globales (404, errorHandler)
│   │   ├── errorHandler.js
│   │   └── notFound.js
│   ├── routes/             Definición de rutas
│   │   ├── index.js
│   │   ├── products.routes.js
│   │   └── sales.routes.js
│   ├── services/           Lógica de negocio y acceso a datos
│   │   ├── products.service.js
│   │   └── sales.service.js
│   ├── app.js              Configuración de Express y middlewares
│   └── server.js           Punto de entrada y arranque del servidor HTTP
├── .env.example            Plantilla de variables de entorno
├── package.json            Dependencias y scripts
└── README.md
```

## Requisitos

- Node.js 18 o superior.
- npm.

## Instalación de dependencias

```bash
cd backend
npm install
```

## Ejecución

- Modo desarrollo (con recarga automática):
  ```bash
  npm run dev
  ```
- Modo producción:
  ```bash
  npm start
  ```

## Endpoints base

- `GET /api/health` - Comprobación de estado del servicio.
- `GET /api/products` - Listar productos.
- `GET /api/products/:sku` - Obtener un producto por SKU.
- `POST /api/products` - Crear producto.
- `PUT /api/products/:sku` - Actualizar producto.
- `DELETE /api/products/:sku` - Eliminar producto.
- `GET /api/sales` - Listar ventas.
- `POST /api/sales` - Registrar venta.
- `POST /api/sales/:id/undo` - Anular / deshacer venta.
