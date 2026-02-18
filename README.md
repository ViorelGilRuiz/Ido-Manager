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

### 📝 Editor de template
- Edicion de metadata y schema
- Autosave con debounce
- Estado de guardado en tiempo real

### 🖥️ App privada
- Layout profesional (sidebar + topbar)
- Dashboard modular
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

## 🛣️ Roadmap
- RBAC granular
- Colaboracion en tiempo real
- Versionado de templates/documents
- Exportacion PDF/Excel
- Notificaciones inteligentes
- Analitica por negocio

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
Si quieres, en el siguiente paso te lo adapto tambien en ingles para recruiters internacionales (`README_ES.md` + `README.md` en EN).
