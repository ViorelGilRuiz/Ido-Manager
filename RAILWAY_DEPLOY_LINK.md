# 🚀 DESPLEGAR A RAILWAY - LINK DIRECTO

## ⚡ OPCIÓN RÁPIDA: CLICK AQUÍ

Abre este enlace en tu navegador (ya tiene todo preconfigurado):

```
https://railway.app/new?repo=https://github.com/ViorelGilRuiz/Ido-Manager&rootDirectory=apps/api
```

---

## 📋 QUÉ HARÁ RAILWAY AUTOMÁTICAMENTE:

✅ Detectar tu repositorio GitHub  
✅ Crear el proyecto  
✅ Configurar el directorio correcto: `apps/api`  

---

## 🔧 LO QUE TÚ HACES:

### 1. Abre el link arriba ⬆️

### 2. Autoriza con GitHub
- Click en "Sign in with GitHub"
- Railway conectará automáticamente

### 3. AGREGA LAS VARIABLES (CRÍTICO ⚠️)

Cuando Railway pregunte por variables, agrega EXACTAMENTE ESTO:

```
NODE_ENV = production
DATABASE_URL = file:./prisma/dev.db
JWT_ACCESS_SECRET = mi-super-secreto-prod-cambialoooo
JWT_REFRESH_SECRET = otro-secreto-prod-cambialoooo  
CLIENT_URL = https://ido-manager-app-front.netlify.app
```

**Los SECRET pueden ser CUALQUIER texto largo diferente entre sí.**

### 4. DEPLOY
- Click en el botón "Deploy" 
- Espera 2-3 minutos

### 5. OBTÉN LA URL
Una vez desplegado:
- Ve a "Deployments"
- Copia la URL pública (algo como: `https://ido-manager-api-xxxx.railway.app`)
- GUÁRDALA

---

## 🔗 ACTUALIZAR NETLIFY (IMPORTANTE)

1. Abre https://app.netlify.com
2. Selecciona: "ido-manager-app-front"
3. "Site settings" → "Build & deploy" → "Environment"
4. Agrega variable:

```
API_BASE_URL = https://tu-url-de-railway.railway.app/api/v1
```

Reemplaza `tu-url-de-railway` con lo que copiaste en paso 5.

5. Presiona "Save"
6. Espera a que Netlify redeploy (banner verde)

---

## ✅ PRUEBA

Abre: https://ido-manager-app-front.netlify.app/login

Entra con:
```
Email: viorelgilruiz@gmail.com
Contraseña: Sultan//..2018
```

---

## 🎉 ¡LISTO!

Si funciona, tu aplicación está en producción completa:
- Frontend: https://ido-manager-app-front.netlify.app
- Backend: https://tu-api.railway.app
- BD: SQLite en Railway

---

**¿Problemas? Abre la consola del navegador (F12) y copia el error aquí.**
