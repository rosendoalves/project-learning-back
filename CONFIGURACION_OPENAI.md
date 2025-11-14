# Configuración de OpenAI API Key

## 📍 Ubicación de las Credenciales

Las keys de OpenAI se configuran en el archivo **`.env`** en la raíz del proyecto backend.

---

## 🔧 Pasos para Configurar

### 1. Crear archivo `.env`

En la carpeta `project-new-backend`, crea un archivo llamado `.env`:

```bash
cd project-new-backend
touch .env
# O en Windows:
type nul > .env
```

### 2. Copiar plantilla

Copia el contenido de `.env.example` a `.env`:

```bash
# En Linux/Mac
cp .env.example .env

# En Windows (PowerShell)
Copy-Item .env.example .env

# O manualmente: abre .env.example, copia todo y pégalo en .env
```

### 3. Agregar tu API Key de OpenAI

Abre el archivo `.env` y completa la variable:

```env
OPENAI_API_KEY=sk-proj-tu_api_key_real_aqui
```

**⚠️ IMPORTANTE**: Reemplaza `sk-proj-tu_api_key_real_aqui` con tu API key real.

---

## 🔑 Cómo Obtener tu API Key de OpenAI

### Paso a Paso:

1. **Ir a OpenAI Platform**
   - URL: https://platform.openai.com/api-keys

2. **Iniciar sesión o crear cuenta**
   - Si no tienes cuenta, créala (requiere tarjeta de crédito para uso de pago)

3. **Crear nueva API Key**
   - Click en "Create new secret key"
   - Dale un nombre (ej: "Plataforma Educativa")
   - Click en "Create secret key"

4. **Copiar la key**
   - ⚠️ **Copia inmediatamente** - solo se muestra una vez
   - Formato: `sk-proj-...` o `sk-...`

5. **Pegar en `.env`**
   ```env
   OPENAI_API_KEY=sk-proj-abc123def456ghi789...
   ```

---

## 📝 Estructura del archivo `.env`

Tu archivo `.env` debe verse así:

```env
# ============================================
# Configuración del Servidor
# ============================================
PORT=3000
NODE_ENV=development

# ============================================
# Base de Datos MongoDB
# ============================================
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# ============================================
# Autenticación JWT
# ============================================
JWT_SECRET=tu_secreto_jwt_super_seguro_aqui
JWT_EXPIRES_IN=7d

# ============================================
# OpenAI API Configuration
# ============================================
OPENAI_API_KEY=sk-proj-TU_API_KEY_REAL_AQUI

# Modelos de IA (opcional)
OPENAI_SIMPLE_MODEL=gpt-3.5-turbo
OPENAI_ADVANCED_MODEL=gpt-4o-mini
OPENAI_GRADING_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=2000
```

---

## 🔒 Seguridad

### ✅ Hacer:
- ✅ Guardar `.env` en `.gitignore` (ya está configurado)
- ✅ Nunca commitear `.env` al repositorio
- ✅ Usar diferentes keys para desarrollo y producción
- ✅ Rotar keys periódicamente

### ❌ No Hacer:
- ❌ Compartir tu API key públicamente
- ❌ Commitear `.env` al repositorio
- ❌ Hardcodear keys en el código
- ❌ Exponer keys en el frontend

---

## 🧪 Verificar que Funciona

### 1. Reiniciar el servidor

```bash
npm run dev
```

### 2. Probar endpoint de IA

```bash
# Con token de autenticación
POST http://localhost:3000/api/ai/generate
Authorization: Bearer tu_token_jwt
Content-Type: application/json

{
  "contentType": "topic",
  "courseId": "course_id",
  "studentLevel": "2° Año",
  "context": "Álgebra básica"
}
```

### 3. Verificar logs

Si la key está correcta, verás:
```
🔄 Generando nuevo contenido topic con IA...
✅ Contenido generado exitosamente
```

Si hay error, verás:
```
❌ Error: Invalid API key
```

---

## 🚨 Troubleshooting

### Error: "OpenAI API key not found"

**Causa**: La variable `OPENAI_API_KEY` no está en `.env` o está vacía.

**Solución**:
1. Verifica que el archivo `.env` existe en `project-new-backend/`
2. Verifica que tiene la línea: `OPENAI_API_KEY=sk-proj-...`
3. Reinicia el servidor después de agregar la variable

### Error: "Invalid API key"

**Causa**: La API key es incorrecta o fue revocada.

**Solución**:
1. Verifica que copiaste la key completa (empieza con `sk-proj-` o `sk-`)
2. Genera una nueva key en OpenAI Platform
3. Actualiza `.env` con la nueva key
4. Reinicia el servidor

### Error: "Insufficient quota"

**Causa**: No tienes créditos en tu cuenta de OpenAI.

**Solución**:
1. Ve a https://platform.openai.com/account/billing
2. Agrega método de pago
3. Configura límites de uso si es necesario

---

## 💰 Configuración de Límites en OpenAI

Para controlar costos, configura límites en OpenAI:

1. Ve a: https://platform.openai.com/account/limits
2. Configura:
   - **Hard limit**: Máximo de gasto por mes
   - **Soft limit**: Alerta cuando se alcanza cierto gasto

**Recomendación inicial**: $50 USD/mes (hard limit)

---

## 📊 Monitoreo de Uso

Puedes monitorear el uso de tu API key en:
- https://platform.openai.com/usage

El sistema también trackea tokens usados en el cache (ver `/api/ai/stats`).

---

## 🔄 Rotación de Keys

Para mayor seguridad, rota tus keys periódicamente:

1. Genera nueva key en OpenAI Platform
2. Actualiza `.env` con la nueva key
3. Revoca la key antigua en OpenAI Platform
4. Reinicia el servidor

---

## 📝 Resumen

**Ubicación**: `project-new-backend/.env`

**Variable**: `OPENAI_API_KEY=sk-proj-tu_key_aqui`

**Obtener key**: https://platform.openai.com/api-keys

**Verificar**: Reiniciar servidor y probar endpoint `/api/ai/generate`

