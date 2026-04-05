# ✅ Configuración Completada - I Do Manager App

## 🎯 Estado Actual

Tu aplicación está **lista para funcionar en Netlify**, pero necesita un backend desplegado.

### ✅ Lo que está hecho:

1. **Frontend (Angular)** - Configurado dinámicamente
   - Detecta automáticamente el entorno (local o producción)
   - En localhost: usa `http://localhost:3000/api/v1`
   - En Netlify: usa `https://ido-manager-api.up.railway.app/api/v1` (configurable)

2. **Backend (NestJS)** - CORS configurado
   - Permite requests desde: `http://localhost:4200` y `https://ido-manager-app-frontend.netlify.app`
   - Base de datos: SQLite con Prisma
   - Usuario ya creado: `viorelgilruiz@gmail.com` / `Sultan//..2018`

3. **Build de Producción** - Completado sin errores
   - Output: `/apps/web/dist/web`
   - Ready para Netlify

---

## 🚀 Próximos Pasos para Acceder en Netlify

### Opción A: Desplegar Backend en Railway (5 minutos)

```bash
1. Ir a https://railway.app
2. Conectar tu repositorio GitHub
3. Agregar estas variables de entorno:
   - NODE_ENV=production
   - DATABASE_URL=file:./prisma/dev.db
   - JWT_ACCESS_SECRET=tu-secret-aleatorio
   - JWT_REFRESH_SECRET=otro-secret-aleatorio
   - CLIENT_URL=https://ido-manager-app-frontend.netlify.app

4. Desplegar y obtener la URL (ej: https://tu-api.railway.app)

5. Actualizar en el código o en Netlify:
   - Variable de entorno: API_BASE_URL=https://tu-api.railway.app/api/v1
```

### Opción B: Usar un servicios simplificado

Si quieres probarlo SIN desplegar backend, crea un `/netlify/functions/api.js` para redirigir.

---

## 🌐 URLs Actuales

| Componente | Ubicación | Estado |
|-----------|-----------|--------|
| **Frontend** | https://ido-manager-app-frontend.netlify.app | ✅ Activo |
| **Backend Local** | http://localhost:3000 | ✅ Activo (desarrollo) |
| **Backend Producción** | railway.app | ⏳ Pendiente desplegar |

---

## 🔐 Credenciales de Prueba

```
Email: viorelgilruiz@gmail.com
Contraseña: Sultan//..2018
Rol: ADMIN
```

---

## 💻 Para Desarrollo Local (Ahora Funcionando)

```bash
# Backend
cd apps/api
npm run start:dev

# Frontend (otra terminal)
cd apps/web
npm start

# Accede a http://localhost:4200
```

---

## 📝 Archivos Nuevos/Modificados

**Nuevos:**
- `/apps/web/src/app/core/api.service.ts` - Servicio centralizado de URLs
- `/DEPLOYMENT.md` - Guía detallada de despliegue
- `/deploy-railway.sh` - Script para despliegue automatizado

**Modificados:**
- `/apps/web/src/index.html` - Inyección de `API_BASE_URL`
- `/apps/api/src/main.ts` - CORS múltiples orígenes
- `.env` - URLs de Netlify

---

## ✨ Características de la Configuración

✅ **Dinámico**: Detecta automáticamente donde recorrer (local/prod)  
✅ **Seguro**: Inyección de variables de entorno  
✅ **Flexible**: Puedes cambiar API_BASE_URL en runtime  
✅ **CORS Habilitado**: Para cualquier origen configurado  
✅ **Cookies**: Refresh tokens almacenados en cookies HttpOnly  

---

## 🎬 Resumen Rápido

### Desarrollo Local ✅
1. Servidores corriendo
2. Base de datos creada
3. Usuario creado
4. Listo para usar en http://localhost:4200

### Producción (Siguiente)
1. Desplegar backend a Railway/Render
2. Actualizar `API_BASE_URL`
3. Redeployar frontend en Netlify
4. ¡Listo en el mundo!

---

## 🆘 Solución Rápida de Problemas

**Si en Netlify dice "Cannot connect to API":**
```javascript
// En la consola del navegador (F12)
// Puedes ver qué URL está usando:
console.log(window.API_BASE_URL);

// Y cambiarla si es necesario:
// localStorage.setItem('API_BASE_URL', 'https://tu-api-aqui.com/api/v1')
// Recarga la página
```

---

## 📚 Documentación

- `DEPLOYMENT.md` - Guía completa de despliegue
- `README.md` - Información del proyecto
- `apps/api/README.md` - Documentación del backend

---

**¡Listo para continuar! 🚀**

¿Necesitas ayuda desplegar el backend o hay algo que no funciona?
