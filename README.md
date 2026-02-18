# I Do Manager

I Do Manager es una plataforma SaaS modular para organizacion de bodas y eventos, enfocada en dos perfiles:

- `ADMIN` (wedding planner / negocio)
- `CLIENT` (cliente final)

Su objetivo es convertir la planificacion en un sistema estructurado, visual y reutilizable basado en **templates inteligentes**.

## Propuesta de valor

- Estandariza operaciones de wedding planning con plantillas reutilizables.
- Reduce errores operativos con checklist, timeline, presupuesto, invitados y proveedores.
- Permite crear experiencias premium para cliente final con seguimiento claro.
- Escala por negocio con enfoque multi-tenant (`businessId`).

## Stack tecnico

### Frontend

- Angular (standalone components)
- TypeScript
- RxJS
- Routing modular por features
- UI/UX custom con enfoque dashboard + editor visual

### Backend

- Node.js
- NestJS
- TypeScript
- Prisma ORM
- JWT auth + refresh flow
- DTOs + validacion con class-validator

### Base de datos

- PostgreSQL (docker)
- Soporte de desarrollo local con SQLite para fallback rapido

### Calidad y tooling

- ESLint
- Prettier
- Husky (pre-commit)
- lint-staged
- Workspaces NPM
- Docker Compose

## Arquitectura del monorepo

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

### Principios aplicados

- Arquitectura modular por features
- Separacion backend/frontend clara
- Contratos de API versionados (`/api/v1/...`)
- DTOs y validacion fuerte en backend
- Modelo orientado a producto (templates -> documents)

## Dominio del producto

### Entidades principales

- `User`
- `Business`
- `Event`
- `Template`
- `Document`

### Flujo core

1. Se crea template base (checklist/timeline/budget/etc.)
2. Se crea evento
3. Se instancia document desde template para ese evento
4. Se edita/actualiza el contenido operativo

## Funcionalidades implementadas

### Autenticacion y sesion

- Registro
- Login
- Perfil de usuario (`me`)
- Guards de acceso en front
- Interceptor auth

### Templates (core del producto)

- Wizard de creacion por pasos
- Presets para wedding planner, cliente y modo mixto
- Edicion de estructura (secciones/campos)
- Duplicado y reordenacion de bloques
- Biblioteca de templates con filtros y ordenacion
- Duplicar/eliminar templates
- Preview en grande tipo "Canva" con modal visual
- Galeria de plantillas ejemplo orientadas a bodas

### Editor de templates

- Edicion de metadata + estructura
- Autosave con debounce
- Estado de guardado visible

### Panel privado

- Sidebar + topbar
- Dashboard modular
- Navegacion por features
- Estilos responsive

## Endpoints relevantes (v1)

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

## Ejecucion local

### Requisitos

- Node 20+
- npm 10+
- Docker + Docker Compose

### Setup

1. Clonar repo
2. Crear variables de entorno desde `.env.example`
3. Instalar dependencias
4. Levantar servicios base
5. Ejecutar migraciones
6. Iniciar apps

```bash
npm install
npm run dev:db
npm --workspace apps/api run prisma:generate
npm --workspace apps/api run prisma:migrate -- --name init
npm run dev
```

### URLs de desarrollo

- Frontend: `http://localhost:4200`
- API: `http://localhost:3000`
- PgAdmin: `http://localhost:5050`

## Docker

`docker-compose.yml` incluye:

- PostgreSQL
- PgAdmin
- (y servicios de aplicacion segun entorno)

Comando util:

```bash
docker compose up -d
```

## Seguridad

- JWT en requests autenticadas
- Refresh token strategy
- Validacion de payloads en backend
- Filtrado por contexto de negocio (`businessId`) en endpoints de dominio

## UX/UI

- Dashboard privado consistente
- Sistema visual de tarjetas y micro-interacciones
- Diseno responsive desktop/mobile
- Preview enriquecida para reducir friccion antes de guardar
- Flujo de templates orientado a productividad real

## Roadmap sugerido

- RBAC avanzado por permisos granulares
- Colaboracion en tiempo real (multi-user editing)
- Historial/versionado de templates y documents
- Exportacion PDF/Excel
- Notificaciones y recordatorios automativos
- Analitica de productividad por negocio

## Enfoque profesional del proyecto

Este proyecto esta planteado como producto real, no solo como demo tecnica:

- Arquitectura mantenible
- Dominio de negocio bien delimitado
- Calidad de codigo y tooling
- Orientacion clara a escalabilidad SaaS
- Experiencia de usuario cuidada para operaciones de alto detalle

## Autor

**Viorel Gil Ruiz**

Desarrollador Full Stack orientado a producto, arquitectura y experiencia de usuario.

---

Si te interesa colaborar o evaluar el proyecto para entorno profesional, puedes usar este repositorio como base para una vertical SaaS completa en el sector eventos.
