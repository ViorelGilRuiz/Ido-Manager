# Guía de Despliegue - I Do Manager App

## 🚀 Estado Actual

- ✅ **Frontend**: Desplegado en Netlify (https://ido-manager-app-frontend.netlify.app)
- ✅ **Backend**: Necesita despliegue en plataforma en la nube (Railway, Render, Vercel, etc.)
- ✅ **Base de datos**: SQLite (incluida en el repositorio)

---

## 📋 Opción 1: Desplegar Backend en Railway.app (Recomendado)

### Paso 1: Crear cuenta en Railway.app
1. Ir a https://railway.app
2. Registrarse con GitHub

### Paso 2: Crear nuevo proyecto
1. Hacer clic en "New Project"
2. Seleccionar "Deploy from GitHub"
3. Conectar tu repositorio de GitHub (`viorelgilruiz/ido-manager`)

### Paso 3: Configurar variables de entorno
En el dashboard de Railway, agregar las siguientes variables:

```env
NODE_ENV=production
API_PORT=3000
DATABASE_URL=file:./prisma/dev.db
JWT_ACCESS_SECRET=tu-secret-aleatorio-largo
JWT_REFRESH_SECRET=otro-secret-aleatorio-largo
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CLIENT_URL=https://ido-manager-app-frontend.netlify.app
```

### Paso 4: Configurar el despliegue
1. En Railway, seleccionar el servicio NestJS/API
2. Configurar el comando de inicio: `npm run start:prod`
3. Asegurarse de que el puerto sea 3000

### Paso 5: Obtener la URL del backend
Una vez desplegado, Railway te proporcionará una URL como:
```
https://ido-manager-api.railway.app
```

---

## 📋 Opción 2: Desplegar en Render.com

### Paso 1: Crear cuenta en Render
1. Ir a https://render.com
2. Conectar con GitHub

### Paso 2: Crear servicio web
1. Hacer clic en "New +"
2. Seleccionar "Web Service"
3. Conectar repositorio
4. Configurar:
   - **Name**: `ido-manager-api`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`

### Paso 3: Agregar variables de entorno
```env
NODE_ENV=production
DATABASE_URL=file:./prisma/dev.db
JWT_ACCESS_SECRET=tu-secret-aleatorio
JWT_REFRESH_SECRET=otro-secret-aleatorio
CLIENT_URL=https://ido-manager-app-frontend.netlify.app
```

---

## 📋 Opción 3: Desplegar Backend en el mismo Netlify (Usando Functions)

Si prefieres todo en Netlify, puedes usar Netlify Functions, pero requiere cambios en la arquitectura. Contacta si necesitas esta opción.

---

## 🔧 Configurar Frontend para tu Backend Desplegado

Una vez tengas la URL del backend desplegado, actualiza:

### 1. Archivo `.env` (para desarrollo localmente):
```env
CLIENT_URL=http://localhost:4200,https://ido-manager-app-frontend.netlify.app
```

### 2. En Netlify (si lo necesitas):
Puedes agregar una variable de entorno en el dashboard de Netlify:
```
API_BASE_URL=https://tu-backend-desplegado.com/api/v1
```

Esto será inyectado en `index.html` automáticamente.

---

## 🌐 URLs Finales

**Frontend**: https://ido-manager-app-frontend.netlify.app  
**Backend**: https://tu-backend-desplegado.com/api/v1

---

## 🧪 Prueba Local Antes de Desplegar

```bash
# Terminal 1: Backend
cd apps/api
npm run start:dev

# Terminal 2: Frontend
cd apps/web
npm start

# Accede a http://localhost:4200
```

---

## 📝 Credenciales de Prueba

```
Email: viorelgilruiz@gmail.com
Contraseña: Sultan//..2018
Rol: ADMIN
```

---

## ✅ Checklist de Despliegue

- [ ] Repositorio compartido/accesible en GitHub
- [ ] Variables de entorno configuradas en la plataforma destino
- [ ] JWT_ACCESS_SECRET y JWT_REFRESH_SECRET son valores seguros y únicos
- [ ] CLIENT_URL incluye la URL de Netlify del frontend
- [ ] Base de datos migrada (`npm run prisma:migrate`)
- [ ] Seed ejecutado (`npm run prisma:seed`) 
- [ ] Build completado sin errores (`npm run build` en apps/web)
- [ ] URLs CORS correctamente configuradas

---

## 🐛 Solución de Problemas

### Error: "Cannot reach API"
- Verifica que la URL del backend está correctamente configurada
- Revisa los logs del backend para errores
- Asegúrate de que CORS está habilitado para tu dominio de Netlify

### Error: "Invalid credentials"
- Verifica que el usuario fue creado con `npm run prisma:seed`
- Revisa que el hash de la contraseña es correcto

### Error: "Database not found"
- Asegúrate de ejecutar `npm run prisma:migrate` en el backend
- Verifica que la ruta de DATABASE_URL es correcta

---

## 📞 Soporte

Si necesitas ayuda, contáctame con:
- Pantalla de error exacta
- Logs del backend (`npm run start:dev`)
- Variable de entorno configurada
