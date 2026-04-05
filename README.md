# I Do Manager

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-0f766e?style=for-the-badge" alt="status"/>
  <img src="https://img.shields.io/badge/Frontend-Angular-dd0031?style=for-the-badge&logo=angular&logoColor=white" alt="angular"/>
  <img src="https://img.shields.io/badge/Backend-NestJS-e0234e?style=for-the-badge&logo=nestjs&logoColor=white" alt="nestjs"/>
  <img src="https://img.shields.io/badge/ORM-Prisma-2d3748?style=for-the-badge&logo=prisma&logoColor=white" alt="prisma"/>
  <img src="https://img.shields.io/badge/DB-PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="postgres"/>
  <img src="https://img.shields.io/badge/Infra-Docker-2496ed?style=for-the-badge&logo=docker&logoColor=white" alt="docker"/>
</p>

## ✨ Vision
**I Do Manager** es una plataforma SaaS modular para wedding planners y clientes finales, enfocada en convertir la planificacion de bodas y eventos en un sistema visual, escalable y reutilizable basado en templates inteligentes.

Perfiles principales:
- `ADMIN` → wedding planner / negocio
- `CLIENT` → cliente final

## 📌 Highlights (GitHub)
- `Template Marketplace` visual estilo galeria (exploracion de plantillas)
- `Editor Libre` avanzado para editar templates con canvas visual
- `Events Control Center` con vistas `Cards / Board / Timeline`
- `Event Detail` con generacion de documentos desde templates y pack core
- Arquitectura modular `Angular + NestJS + Prisma` lista para evolucionar a SaaS

## 🧭 Navegacion rapida
- `Dashboard` → KPIs y cockpit operativo
- `Templates` → biblioteca, filtros, comparador, marketplace visual
- `Editor Libre` → canvas visual + capas + estilos + herramientas pro
- `Events` → gestion operativa + agenda + acciones en lote
- `Event Detail` → documentos por evento y cobertura core

## 🎯 Propuesta de valor
- Estandariza operaciones con templates reutilizables.
- Reduce errores con checklist, timeline, budget, invitados y proveedores.
- Mejora la experiencia del cliente con flujos claros y visuales.
- Permite escalar por negocio con enfoque multi-tenant (`businessId`).

## 🧱 Stack tecnico
| Capa | Tecnologia |
|---|---|
| Frontend | Angular (standalone), TypeScript, RxJS |
| Backend | NestJS, Node.js, TypeScript |
| ORM | Prisma |
| Base de datos | PostgreSQL (Docker) + SQLite fallback dev |
| Auth | JWT + refresh token |
| Calidad | ESLint, Prettier, Husky, lint-staged |
| Infra | Docker Compose, NPM Workspaces |

## 🏗️ Arquitectura
```text
ido-manager/
  apps/
    web/         # Angular app
    api/         # NestJS API
  packages/
    shared/      # Tipos/contratos compartidos
  docker/
  docker-compose.yml
  README.md
```

Principios aplicados:
- Arquitectura modular por features
- Separacion clara frontend/backend
- API versionada (`/api/v1/...`)
- DTOs + validacion robusta
- Modelo de producto: `Template -> Document`

## 🧠 Dominio
Entidades core:
- `User`
- `Business`
- `Event`
- `Template`
- `Document`

Flujo principal:
1. Crear template base
2. Crear evento
3. Instanciar documento desde template
4. Editar contenido operativo del evento

## 🚀 Funcionalidades implementadas
### 🔐 Auth
- Register / Login / Refresh / Logout / Me
- Guards de ruta e interceptor auth

### 🧩 Template Studio (core)
- Wizard de creacion por pasos
- Presets (planner / client / mixed)
- Edicion estructural (secciones/campos)
- Duplicado y reordenacion de bloques
- Biblioteca con filtros y ordenacion
- Vista previa grande tipo Canva
- Galeria visual de plantillas de boda
- Favoritos persistentes + comparador de plantillas (hasta 3)
- Filtro por calidad minima y orden por calidad
- Cockpit de negocio para cobertura de biblioteca
- Generacion automatica de templates core faltantes
- Generador automatico por brief (estilo, invitados y presupuesto)
- Autorrelleno masivo de campos + pack Wedding 360
- Conversion 1-click a version cliente (plantilla simplificada)
- Pulido de copy para cliente final en preview del wizard
- Preview grande con modos visuales (`Showcase` / `Board`)
- Vista marketplace/galeria de templates con cards premium y filtros visuales
- Acceso directo a `Editor Libre` desde sidebar y dashboard
- Ruta dedicada del editor libre (`/app/free-editor`)

### 📝 Editor de template
- Edicion de metadata y schema
- Autosave con debounce
- Estado de guardado en tiempo real
- Undo / Redo + colapsado de secciones
- Validacion inteligente con score de completitud
- Limpieza de campos vacios y normalizacion de keys
- Packs operativos por seccion para wedding planner
- Preview en vivo con modo desktop/mobile
- Preview por perfil (planner/cliente) + simulacion de avance
- Modal premium de preview + catalogo de plantillas destacadas
- Boton de autocompletado de campos requeridos
- Generador rapido de checklist cliente dentro del editor
- Slots horarios de Dia B por seccion en 1 click
- Preview por etapa (`Pre-boda`, `Dia B`, `Post`) con datos dinamicos
- Modo reveal animado en preview grande para demos comerciales
- `Editor Libre` (canvas visual) con herramientas avanzadas:
  - movimiento libre de capas
  - toolbar contextual sobre capa seleccionada
  - panel profesional por pestañas (`Canvas`, `Selección`, `Bloques`, `Estilo`, `Acciones`)
  - inspector completo (texto manual, colores, posicion, tamaño, opacidad, estilos)
  - resize con handles visuales
  - rotacion con handle visual (snap con `Shift`)
  - presets de snap/nudge (`Precision`, `Balanced`, `Fast`)
  - guias de centro, grid y snap configurables
  - shortcuts avanzados (mover, duplicar, borrar, bloquear, ocultar, navegar capas)
  - layer stack (capas ordenadas por z-index)
  - bloques/cajones y kits visuales (`Hero`, `Stats`, `CTA`, `Firma`, etc.)
  - paletas rapidas de capa y tema global
  - efectos avanzados (`blur`, `blend mode`, `border`, presets glass/glow/elevated`)
  - exportacion PDF desde preview

### 📊 Dashboard & Events
- Layout profesional (sidebar + topbar)
- Dashboard premium con score global de pipeline
- KPIs de cobertura por tipos de template
- Dashboard con acceso directo a `Editor Libre`
- Events control center avanzado:
  - filtros avanzados, busqueda y ordenacion
  - vistas `Cards`, `Board` (kanban por estado) y `Timeline`
  - seleccion multiple y acciones en lote
  - activacion/archivado/duplicado/eliminacion masiva
  - asignacion de fechas IA y desplazamiento de fechas por lote (`+/- dias`)
  - timeline con horizonte configurable y estado visual de urgencia
  - creacion rapida de series de eventos (fases x3)
  - IA helper para autoplanificacion, conflictos y readiness documental
- Tarjetas de eventos con acciones operativas y edicion inline

### 📁 Event detail & Document Studio
- Vista de detalle de evento con KPIs de documentos
- Recomendaciones de templates para crear docs en 1 click
- Workbench de documentos en detalle de evento:
  - cobertura core (`CHECKLIST`, `TIMELINE`, `BUDGET`, `GUEST_LIST`, `VENDOR_LIST`)
  - deteccion de bloques faltantes
  - creacion de pack core faltante en lote
  - filtros de documentos por tipo, busqueda y orden
- Control rapido del evento desde el detalle (nombre, estado, fecha, activar hoy)
- Editor de documentos dinamico por schema (`text`, `number`, `date`, `time`, `currency`, `select`, `textarea`, `checkbox`)
- Autosave de documento cada 800ms con estado de guardado

### 🖥️ App privada
- Experiencia responsive

## 🌐 API v1 (endpoints clave)
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/templates`
- `POST /api/v1/templates`
- `GET /api/v1/templates/:id`
- `PATCH /api/v1/templates/:id`
- `DELETE /api/v1/templates/:id`
- `GET /api/v1/events`
- `POST /api/v1/events`
- `GET /api/v1/events/:eventId/documents`
- `POST /api/v1/events/:eventId/documents`

Health check:
- `GET http://localhost:3000/api/health`

## ⚙️ Setup local
### Requisitos
- Node 20+
- npm 10+
- Docker + Docker Compose

### Comandos
```bash
npm install
npm run dev:db
npm --workspace apps/api run prisma:generate
npm --workspace apps/api run prisma:migrate -- --name init
npm run dev
```

### URLs
- Frontend: `http://localhost:4200`
- API: `http://localhost:3000`
- PgAdmin: `http://localhost:5050`

## 🐳 Docker
Servicios incluidos en `docker-compose.yml`:
- PostgreSQL
- PgAdmin
- servicios de aplicacion segun entorno

```bash
docker compose up -d
```

## 🔒 Seguridad
- JWT para sesiones autenticadas
- Refresh token strategy
- Validacion de payloads en backend
- Filtrado por `businessId` para aislamiento multi-tenant

## 🎨 UX/UI
- Sistema visual con tarjetas y micro-interacciones
- Diseno premium orientado a productividad
- Preview rica para validar antes de guardar
- Responsive desktop/mobile
- Design system global consistente (forms, cards, headers, grid, status chips)
- Layout compacto, limpio y orientado a conversion/demo comercial
- Vista previa grande ampliada y optimizada para presentaciones a cliente
- Sidebars y workbenches con herramientas por contexto (templates, editor, events)
- Flujos de edicion visual y operativa pensados para planners (rapidez + control)

## 🖼️ Capturas recomendadas (para GitHub)
Para mejorar la presentacion del repo en GitHub, añade screenshots en una carpeta `docs/screenshots/` y referencialos aqui:
- `Dashboard` (KPIs y accesos)
- `Templates Marketplace` (galeria estilo Notion)
- `Editor Libre` (canvas + panel de herramientas)
- `Events Board` (kanban operativo)
- `Events Timeline` (agenda visual)
- `Event Detail` (documentos + cobertura core)

Ejemplo:
```md
![Editor Libre](docs/screenshots/free-editor.png)
```

## 🧪 Calidad y verificacion
- Build frontend validado tras cada iteracion:
  - `npm --workspace apps/web run build`
- Lint y pruebas listos para integracion continua
- Estructura lista para evolucionar a version enterprise

## 🛣️ Roadmap
- RBAC granular
- Colaboracion en tiempo real (multiusuario en editor/canvas)
- Versionado de templates/documents
- Exportacion PDF/Excel avanzada (fidelidad visual del canvas)
- Notificaciones inteligentes
- Analitica por negocio
- Personalizacion de marca por negocio (white-label)
- Asistentes IA para completar templates automaticamente
- Drag & drop real en Events Board
- Calendar view mensual/semanal para eventos

## 💼 Enfoque profesional
Este proyecto esta planteado como producto real, no como simple demo:
- arquitectura mantenible
- dominio de negocio bien definido
- calidad de codigo y tooling
- capacidad de evolucion a SaaS multi-tenant

## 👨‍💻 Autor
**Viorel Gil Ruiz**  
Desarrollador Full Stack orientado a producto, arquitectura y experiencia de usuario.

---
