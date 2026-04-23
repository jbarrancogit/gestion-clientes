# Setup de Firebase (para sync en la nube)

Hay que hacer esto **una sola vez**. Total: ~5 minutos. Seguí los pasos literal.

---

## 1. Crear el proyecto

1. Entrá a https://console.firebase.google.com
2. Logueate con la cuenta Google que querés usar como "dueña" de los datos.
3. Click en **"Crear un proyecto"** (o "Add project").
4. Nombre del proyecto: `gestion-clientes` (o el que quieras).
5. Cuando pregunte por **Google Analytics**, desactivá el toggle (no hace falta). Click **Continuar**.
6. Click **Crear proyecto**. Esperá que termine y click **Continuar**.

---

## 2. Registrar la app web

1. En el dashboard del proyecto vas a ver varios iconos grandes. Click en el **`</>`** (web).
2. **Alias de la app**: `gestion-clientes` (o lo que quieras). **NO** marques "Also set up Firebase Hosting". Click **Registrar app**.
3. Ahora te muestra un bloque de código con esto:

   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "....firebaseapp.com",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

   **Copiá ese objeto entero y pegámelo en el chat.** Esos son los 6 strings que necesito.

4. Click **Continuar en la consola**.

---

## 3. Habilitar login con Google

1. En el menú izquierdo: **Build → Authentication**.
2. Click **Comenzar** (o "Get started").
3. Tab **"Sign-in method"**.
4. En la lista de proveedores, click **Google**.
5. Activá el toggle **Habilitar**.
6. **Correo electrónico de asistencia del proyecto**: elegí tu mail.
7. Click **Guardar**.

---

## 4. Agregar GitHub Pages como dominio autorizado

1. Seguís en **Authentication**. Tab **"Settings"** (arriba a la derecha).
2. Sección **"Dominios autorizados"** (Authorized domains).
3. Click **Agregar dominio**.
4. Pegá: `jbarrancogit.github.io`
5. Click **Agregar**.

(`localhost` ya está por defecto, sirve para probar en `npm run dev`).

---

## 5. Crear la base Firestore

1. Menú izquierdo: **Build → Firestore Database**.
2. Click **Crear base de datos**.
3. **Ubicación**: elegí `nam5 (us-central)` o `southamerica-east1` (São Paulo, más cerca si estás en Argentina). **Ojo**: una vez elegida no se puede cambiar.
4. Reglas de seguridad: elegí **"Iniciar en modo de producción"**.
5. Click **Habilitar**. Esperá que termine.

---

## 6. Configurar reglas de seguridad

1. En Firestore Database, tab **"Reglas"** (arriba).
2. Borrá todo lo que hay y pegá esto:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

3. Click **Publicar**.

Eso garantiza que cada usuario solo puede ver/editar sus propios datos.

---

## Cuando termines

Pegame en el chat el objeto `firebaseConfig` del paso 2 y ya está — yo me encargo del resto.
