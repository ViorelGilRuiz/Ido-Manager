# 🚀 DESPLIEGUE RÁPIDO - SOLO 3 PASOS

**Tu frontend EN NETLIFY está listo. Necesitas desplegar el BACKEND en 3 pasos.**

---

## PASO 1: IR A RAILWAY (2 minutos)

```
1. Abre: https://railway.app
2. Click en "Sign up with GitHub"
3. Autoriza con tu cuenta GitHub (viorelgilruiz)
```

---

## PASO 2: CREAR PROYECTO (2 minutos)

```
1. Dashboard Railway: "New Project"
2. "Deploy from GitHub repo"
3. Busca y selecciona: viorelgilruiz/ido-manager
4. Selecciona rama "main"
5. ESPERA A QUE TERMINE
```

---

## PASO 3: AGREGAR VARIABLES (2 minutos)

Cuando Railway pregunte por variables de entorno, AGREGA ESTAS:

```
NODE_ENV = production
DATABASE_URL = file:./prisma/dev.db
JWT_ACCESS_SECRET = mi-super-secreto-largo-aqui-1234567890
JWT_REFRESH_SECRET = otro-secreto-largo-diferente-9876543210
CLIENT_URL = https://ido-manager-app-front.netlify.app
```

**Los valores SECRET pueden ser CUALQUIER TEXTO LARGO y DIFERENTE.**

Hit "Deploy" cuando termine.

---

## PASO 4: COPIAR URL (1 minuto)

Una vez desplegado en Railway:
1. Ve a "Deployments"
2. Ve a "Environment"
3. Copia la URL pública como (similar a):
   ```
   https://ido-manager-api-xxxxx.railway.app
   ```

**COPIA ESTA URL COMPLETA**

---

## PASO 5: ACTUALIZAR NETLIFY (2 minutos)

1. Abre: https://app.netlify.com
2. Selecciona tu sitio: **ido-manager-app-front**
3. "Site settings" → "Build & deploy" → "Environment"
4. "Edit variables"
5. AGREGA UNA VARIABLE:

```
API_BASE_URL = https://tu-url-de-railway.railway.app/api/v1
```

Reemplaza `tu-url-de-railway` con lo que copiaste en PASO 4.

**PRESIONA SAVE**

---

## ✅ LISTA

Cuando Netlify diga "Published" (banner verde):

1. Abre: https://ido-manager-app-front.netlify.app/login
2. Intenta entrar:
   - **Email:** viorelgilruiz@gmail.com
   - **Contraseña:** Sultan//..2018

---

## 🎯 TOTAL: 10 MINUTOS

Si todo está bien, ¡YA FUNCIONA! 🎉

---

## ❌ SI NO FUNCIONA

Abre la consola del navegador (F12) y envíame:
1. El mensaje de error exacto
2. La URL que copiaste de Railway
3. La URL que agregaste en Netlify

---

**¡ÉXITO! 🚀**
