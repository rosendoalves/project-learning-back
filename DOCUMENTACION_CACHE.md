# Sistema de Cache para IA - Documentación Técnica

## 📋 Resumen

El sistema utiliza **MongoDB como almacenamiento de cache** (no Redis). Esto simplifica la infraestructura al usar la misma base de datos que el resto de la aplicación, sin necesidad de servicios adicionales.

---

## 🏗️ Arquitectura del Sistema de Cache

### Tipo de Cache: **Cache en Base de Datos (MongoDB)**

```
┌─────────────────────────────────────────┐
│         Solicitud de Contenido IA       │
└──────────────────┬──────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  Generar Cache Key   │
        │  (Hash SHA-256)      │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  Buscar en MongoDB   │
        │  (Collection:        │
        │   AIGeneratedContent)│
        └──────────┬───────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
    ┌─────────┐        ┌──────────┐
    │ CACHE   │        │ NO CACHE │
    │ HIT ✅  │        │ MISS ❌  │
    └────┬────┘        └────┬─────┘
         │                  │
         │                  ▼
         │         ┌─────────────────┐
         │         │ Llamar a OpenAI │
         │         │ (Generar nuevo) │
         │         └────────┬────────┘
         │                  │
         │                  ▼
         │         ┌─────────────────┐
         │         │ Guardar en Cache│
         │         │ (MongoDB)       │
         │         └─────────────────┘
         │                  │
         └──────────────────┘
                   │
                   ▼
         ┌──────────────────┐
         │  Retornar Contenido│
         └───────────────────┘
```

---

## 🔑 Generación de Claves de Cache

### Algoritmo: **SHA-256 Hash**

El sistema genera una clave única basada en:
- Tipo de contenido (`syllabus`, `topic`, `exercise`, `explanation`)
- ID del curso
- Nivel del estudiante
- Contexto específico
- Parámetros adicionales

**Ejemplo:**
```typescript
// Input
{
  contentType: "topic",
  courseId: "507f1f77bcf86cd799439011",
  studentLevel: "2° Año",
  context: "Álgebra básica"
}

// Output (Cache Key)
"ai_topic_a1b2c3d4e5f6g7h8"
```

**Ventaja**: Mismo contenido = misma clave = reutilización automática

---

## 💾 Almacenamiento en MongoDB

### Collection: `AIGeneratedContent`

```typescript
{
  _id: ObjectId,
  cacheKey: "ai_topic_a1b2c3d4e5f6g7h8", // Único, indexado
  contentType: "topic",
  courseId: ObjectId("..."),
  topicId: ObjectId("..."),
  content: {
    title: "Álgebra y Ecuaciones",
    body: "Contenido completo...",
    learningObjectives: ["obj1", "obj2"],
    difficulty: "intermediate"
  },
  metadata: {
    studentLevel: "2° Año",
    context: "Álgebra básica",
    generatedAt: ISODate("2025-01-15"),
    usageCount: 15, // Cuántas veces se usó
    tokensUsed: 1234,
    modelUsed: "gpt-4o-mini"
  },
  expiresAt: ISODate("2025-02-14"), // TTL: 30 días
  createdAt: ISODate("2025-01-15"),
  updatedAt: ISODate("2025-01-20")
}
```

### Collection: `AIRecommendation`

```typescript
{
  _id: ObjectId,
  cacheKey: "rec_user123_abc123def456",
  studentId: ObjectId("..."),
  courseId: ObjectId("..."),
  recommendations: {
    nextTopics: [...],
    suggestedExercises: [...],
    studyPlan: [...],
    areasToFocus: [...]
  },
  metadata: {
    studentProfile: {...},
    generatedAt: ISODate("..."),
    lastUsed: ISODate("..."),
    tokensUsed: 567,
    modelUsed: "gpt-4o-mini"
  },
  expiresAt: ISODate("2025-01-22"), // TTL: 7 días
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

---

## ⚡ Flujo de Funcionamiento

### 1. Solicitud de Contenido

```typescript
// Usuario solicita contenido
POST /api/ai/generate
{
  "contentType": "topic",
  "courseId": "507f1f77bcf86cd799439011",
  "studentLevel": "2° Año",
  "context": "Álgebra básica"
}
```

### 2. Generación de Cache Key

```typescript
// cache.service.ts
const cacheKey = generateCacheKey(
  "topic",
  "507f1f77bcf86cd799439011",
  "2° Año",
  "Álgebra básica"
)
// Resultado: "ai_topic_a1b2c3d4e5f6g7h8"
```

### 3. Búsqueda en Cache

```typescript
// Buscar en MongoDB
const cached = await AIGeneratedContent.findOne({
  cacheKey: "ai_topic_a1b2c3d4e5f6g7h8",
  expiresAt: { $gt: new Date() } // No expirado
})
```

### 4. Cache Hit (Encontrado)

```typescript
if (cached) {
  // Incrementar contador de uso
  cached.metadata.usageCount += 1
  await cached.save()
  
  // Retornar inmediatamente (sin llamar a OpenAI)
  return {
    content: cached.content,
    fromCache: true, // ✅ Indicador de cache hit
    cacheKey: cached.cacheKey
  }
}
```

**Beneficios:**
- ✅ **0 tokens usados** (no se llama a OpenAI)
- ✅ **Respuesta instantánea** (< 50ms vs 2-5 segundos)
- ✅ **0 costo** de API

### 5. Cache Miss (No Encontrado)

```typescript
// No está en cache, generar nuevo
const result = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [...]
})

// Guardar en cache para próximas veces
await saveContentCache(
  cacheKey,
  contentType,
  courseId,
  topicId,
  parsedContent,
  metadata,
  30 // TTL: 30 días
)
```

---

## 📊 Estrategia de TTL (Time To Live)

### TTL por Tipo de Contenido

| Tipo de Contenido | TTL (días) | Razón |
|-------------------|------------|-------|
| **Syllabus** | 30 | Contenido curricular estable |
| **Topic** | 30 | Temas no cambian frecuentemente |
| **Exercise** | 30 | Ejercicios reutilizables |
| **Explanation** | 30 | Explicaciones son estables |
| **Recommendations** | 7 | Necesitan actualización más frecuente |

### Expiración Automática

```typescript
// expiresAt se calcula al guardar
const expiresAt = new Date()
expiresAt.setDate(expiresAt.getDate() + ttl) // +30 días

// MongoDB indexa expiresAt para búsquedas rápidas
AIGeneratedContentSchema.index({ expiresAt: 1 })
```

---

## 🧹 Limpieza Automática de Cache

### Job Programado

```typescript
// cacheCleanup.job.ts
cron.schedule('0 2 * * *', async () => {
  // Ejecuta todos los días a las 2:00 AM
  const deleted = await AIGeneratedContent.deleteMany({
    expiresAt: { $lt: new Date() }
  })
  // Elimina entradas expiradas
})
```

**Beneficios:**
- ✅ Libera espacio en base de datos
- ✅ Mantiene solo contenido válido
- ✅ Mejora rendimiento de búsquedas

---

## 📈 Métricas y Estadísticas

### Tracking de Uso

Cada entrada en cache lleva:
- `usageCount`: Cuántas veces se ha usado
- `lastUsed`: Última vez que se accedió
- `tokensUsed`: Tokens que costó generar (solo primera vez)
- `modelUsed`: Modelo de IA utilizado

### Estadísticas Disponibles

```typescript
GET /api/ai/stats

// Respuesta
{
  "cache": {
    "content": {
      "total": 150,        // Total de entradas
      "totalUsage": 1250,  // Total de veces usado
      "avgUsage": 8.33     // Promedio de uso por entrada
    },
    "recommendations": {
      "total": 45
    }
  }
}
```

---

## 🎯 Optimizaciones Implementadas

### 1. Índices MongoDB

```typescript
// Búsquedas rápidas por cacheKey
AIGeneratedContentSchema.index({ cacheKey: 1 })

// Búsquedas por curso y tipo
AIGeneratedContentSchema.index({ courseId: 1, contentType: 1 })

// Limpieza eficiente de expirados
AIGeneratedContentSchema.index({ expiresAt: 1 })

// Búsquedas por nivel de estudiante
AIGeneratedContentSchema.index({ 'metadata.studentLevel': 1, contentType: 1 })
```

### 2. Reutilización Inteligente

**Mismo contenido para múltiples estudiantes:**
- Si 10 estudiantes de "2° Año" piden contenido de "Álgebra básica"
- Solo se genera **1 vez** (primer estudiante)
- Los otros 9 obtienen del cache
- **Ahorro: 90% de llamadas a IA**

### 3. Cache Warming (Futuro)

Posibilidad de pre-generar contenido común:
- Temarios estándar por año
- Explicaciones de conceptos básicos
- Ejercicios comunes

---

## 💰 Impacto en Costos

### Escenario Sin Cache

```
500 estudiantes × 5 solicitudes/mes = 2,500 llamadas a IA
Costo: 2,500 × $0.05 = $125 USD/mes
```

### Escenario Con Cache (75% hit rate)

```
2,500 solicitudes totales
- 1,875 desde cache (0 costo)
- 625 nuevas (llamadas a IA)
Costo: 625 × $0.05 = $31.25 USD/mes
Ahorro: $93.75 USD/mes (75%)
```

---

## 🔍 Ejemplo Práctico

### Primera Solicitud (Cache Miss)

```typescript
// Estudiante 1 solicita tema de Álgebra
POST /api/ai/generate
{
  "contentType": "topic",
  "courseId": "math_course",
  "studentLevel": "2° Año",
  "context": "Álgebra básica"
}

// Proceso:
1. Genera cacheKey: "ai_topic_abc123"
2. Busca en MongoDB → No encontrado
3. Llama a OpenAI → Genera contenido (1,234 tokens)
4. Guarda en cache con TTL 30 días
5. Retorna contenido

// Tiempo: ~3 segundos
// Costo: $0.05
// Tokens: 1,234
```

### Segunda Solicitud (Cache Hit)

```typescript
// Estudiante 2 solicita el mismo tema
POST /api/ai/generate
{
  "contentType": "topic",
  "courseId": "math_course",
  "studentLevel": "2° Año",
  "context": "Álgebra básica"
}

// Proceso:
1. Genera cacheKey: "ai_topic_abc123" (mismo hash)
2. Busca en MongoDB → ✅ Encontrado
3. Incrementa usageCount: 1 → 2
4. Retorna contenido inmediatamente

// Tiempo: ~50ms
// Costo: $0.00
// Tokens: 0
```

---

## 🚀 Ventajas del Sistema

### ✅ Simplicidad
- No requiere Redis u otro servicio
- Usa la misma base de datos
- Fácil de mantener y depurar

### ✅ Eficiencia
- Búsquedas rápidas con índices MongoDB
- TTL automático
- Limpieza programada

### ✅ Escalabilidad
- MongoDB maneja millones de documentos
- Índices optimizados
- Puede migrar a Redis si es necesario

### ✅ Costo-Efectivo
- Reduce 70-80% de llamadas a IA
- Tracking de uso para optimización
- Estadísticas detalladas

---

## 🔄 Migración Futura a Redis (Opcional)

Si en el futuro necesitas más rendimiento:

```typescript
// Cambiar solo cache.service.ts
import Redis from 'ioredis'
const redis = new Redis(process.env.REDIS_URL)

// Misma interfaz, diferente implementación
export const checkContentCache = async (cacheKey: string) => {
  const cached = await redis.get(cacheKey)
  return cached ? JSON.parse(cached) : null
}
```

**Ventajas de Redis:**
- Más rápido para lecturas (memoria)
- TTL nativo más eficiente
- Mejor para alta concurrencia

**Desventajas:**
- Requiere servicio adicional
- Más complejidad de infraestructura
- Costo adicional

**Recomendación**: MongoDB es suficiente hasta ~10,000 usuarios concurrentes.

---

## 📝 Resumen

**Sistema de Cache Actual:**
- ✅ **Tipo**: MongoDB (Base de datos)
- ✅ **Algoritmo**: SHA-256 Hash para claves
- ✅ **TTL**: 30 días (contenido), 7 días (recomendaciones)
- ✅ **Limpieza**: Automática diaria
- ✅ **Hit Rate Objetivo**: >75%
- ✅ **Ahorro Estimado**: 70-80% en costos de IA

**No requiere servicios adicionales** - Todo funciona con MongoDB que ya tienes configurado.

