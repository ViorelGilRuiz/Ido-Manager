# 🚀 GUÍA RÁPIDA DE DESPLIEGUE - I Do Manager

## ⏰ Tiempo estimado: **10 minutos**

---

## 📋 PASO 1: Desplegar Backend a Railway.app

### 1.1 Crear Cuenta en Railway
```
1. Abre https://railway.app
2. Haz clic en "Sign up with GitHub"
3. Autoriza Railway con tu cuenta GitHub
```

### 1.2 Crear Nuevo Proyecto
```
1. En dashboard de Railway, haz clic en "New Project"
2. Selecciona "Deploy from GitHub repo"
3. Busca y conecta tu repositorio: viorelgilruiz/ido-manager (o tu repo)
4. Railway detectará automáticamente que es un proyecto monorepo
```

### 1.3 Configurar el Servicio
```
1. Ve a "Settings" del proyecto
2. Busca "Root Directory" 
3. Cambia a: apps/api
4. Haz clic en "Deploy"
```

### 1.4 Agregar Variables de Entorno (Muy importante ⚠️)
```
1. En Railway, ve a la pestaña "Variables"
2. Agrega estas variables:

   NODE_ENV = production
   DATABASE_URL = file:./prisma/dev.db
   JWT_ACCESS_SECRET = tu-valor-super-secreto-aqui-cambialoooo
   JWT_REFRESH_SECRET = otro-valor-secreto-diferente
   CLIENT_URL = https://ido-manager-app-front.netlify.app

3. Haz clic en "Save"
4. Railway redesplegará automáticamente
```

### 1.5 Obtén la URL de tu API
```
1. Una vez desplegado, ve a la pestaña "Deployments"
2. Verás una URL como: https://ido-manager-api-xxxx.railway.app
3. COPIA ESTA URL (la necesitarás en Netlify)
4. La URL completa de tu API será: 
   https://ido-manager-api-xxxx.railway.app/api/v1
```

---

## 📋 PASO 2: Actualizar Frontend en Netlify

### 2.1 Agregar Variable de Entorno en Netlify
```
1. Abre https://app.netlify.com
2. Selecciona tu sitio: ido-manager-app-front
3. Ve a "Site settings" → "Build & deploy" → "Environment"
4. Haz clic en "Edit variables"
5. Agrega UNA variable:

   API_BASE_URL = https://tu-url-de-railway.railway.app/api/v1
   
   (Reemplaza con la URL que copiaste en 1.5)

6. Haz clic en "Save"
7. Netlify redesplegará automáticamente
```

### 2.2 Espera a que redeploye
```
- Ve a la pestaña "Deploys"
- Espera a que diga "Published" (color verde)
- Esto toma 1-2 minutos
```

### 2.3 Prueba tu sitio
```
1. Abre https://ido-manager-app-front.netlify.app
2. Ve a /login o /register
3. Intenta entrar con:
   - Email: viorelgilruiz@gmail.com
   - Contraseña: Sultan//..2018
```

---

## ✅ ¿Cómo saber si funciona?

### En el navegador:
```
1. Abre https://ido-manager-app-front.netlify.app/login
2. Abre la consola (F12)
3. Busca el mensaje: "🔌 Current API URL:"
4. Debería decir: https://tu-api.railway.app/api/v1
5. Intenta hacer login
```

### Si ves el error "Cannot connect to API":
```
1. Presiona F12 para abrir DevTools
2. Ve a la pestaña "Network"
3. Intenta hacer login
4. Busca peticiones que digan "401" o "Failed"
5. Verifica el endpoint URL en la petición
6. Debe apuntar a tu URL de Railway
```

---

## 🐛 Solución de Problemas

### ❌ Error: "Failed to fetch from API"
**Solución:**
1. Railway no está desplegado correctamente
2. Verifica que Railway dice "Deployment successful"
3. Intenta acceder directamente a: `https://tu-api.railway.app/api/health`
4. Si ves un JSON, el backend funciona ✅

### ❌ Error: "CORS error"
**Solución:**
1. CLIENT_URL en Railway está mal configurado
2. Verifica que sea exactamente: `https://ido-manager-app-front.netlify.app`
3. Sin "www." y sin "/" al final

### ❌ Error: "Invalid credentials"
**Solución:**
1. El usuario aún no existe en Railway
2. Ejecuta el seed en local: `npm run prisma:seed` (en apps/api)
3. O contacta para que agregue el usuario manualmente

### ❌ La API URL sigue siendo localhost
**Solución:**
1. La variable API_BASE_URL en Netlify no fue guardada
2. Intenta agregar variables nuevamente
3. Después de agregar, presiona "Save" y espera a que redeploye

---

## 💡 Alternativa: Si no puedes esperar

Si Railway está tardando, puedes usar un backend temporal:

### Opción: Usar un backend mock (para testing)
```
1. En Netlify, agrega: API_BASE_URL = http://localhost:3000/api/v1
2. Ejecuta localmente: npm run start:dev (en apps/api)
3. El frontend en Netlify conectará a tu localhost
```

---

## 📝 Resumen de URLs

| Componente | URL |
|-----------|-----|
| Frontend | https://ido-manager-app-front.netlify.app |
| Backend | https://tu-api.railway.app/api/v1 |
| Health Check | https://tu-api.railway.app/api/health |

---

## ✨ Una vez funcione

1. ¡Felicidades! Tu app está en producción 🎉
2. Puedes compartir la URL: https://ido-manager-app-front.netlify.app
3. Los usuarios pueden entrar con las credenciales

---

## 📞 ¿Necesitas ayuda?

1. Captura de pantalla de la URL de Railway
2. Mensaje de error exacto de DevTools (F12 → Console)
3. URL de tu sitio Netlify

Comparte estos datos y te ayudaré inmediatamente.

