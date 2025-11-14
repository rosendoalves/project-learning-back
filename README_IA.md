# Guía de Integración de IA - Plataforma Educativa

## 🚀 Configuración Inicial

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

Copia el archivo `.env.example` a `.env` y completa tus credenciales:

```bash
cp .env.example .env
```

### 3. Obtener API Key de OpenAI

1. Ve a [OpenAI Platform](https://platform.openai.com/api-keys)
2. Crea una cuenta o inicia sesión
3. Genera una nueva API Key
4. Cópiala en tu archivo `.env`:

```env
OPENAI_API_KEY=sk-proj-tu_api_key_aqui
```

## 📋 Variables de Entorno Requeridas

### Mínimas para IA

```env
# OpenAI (REQUERIDO)
OPENAI_API_KEY=sk-proj-tu_api_key_aqui

# Base de Datos (REQUERIDO)
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/database

# JWT (REQUERIDO)
JWT_SECRET=tu_secreto_jwt
```

### Opcionales (con valores por defecto)

```env
# Modelos de IA
OPENAI_SIMPLE_MODEL=gpt-3.5-turbo
OPENAI_ADVANCED_MODEL=gpt-4o-mini
OPENAI_GRADING_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=2000

# Cache TTL (días)
CACHE_TTL_SYLLABUS=30
CACHE_TTL_TOPIC=30
CACHE_TTL_RECOMMENDATIONS=7
```

## 🎯 Endpoints de IA Disponibles

### 1. Generar Contenido Educativo

**POST** `/api/ai/generate`

```json
{
  "contentType": "syllabus|topic|exercise|explanation",
  "courseId": "course_id",
  "topicId": "topic_id (opcional)",
  "studentLevel": "1° Año|2° Año|3° Año",
  "context": "Contexto específico del estudiante",
  "additionalParams": {}
}
```

**Respuesta:**
```json
{
  "success": true,
  "content": {
    "title": "...",
    "body": "...",
    "learningObjectives": [...],
    "difficulty": "intermediate"
  },
  "fromCache": false,
  "cacheKey": "...",
  "tokensUsed": 1234,
  "modelUsed": "gpt-4o-mini"
}
```

### 2. Obtener Recomendaciones Personalizadas

**GET** `/api/ai/recommendations/:courseId`

**Respuesta:**
```json
{
  "success": true,
  "recommendations": {
    "nextTopics": [...],
    "suggestedExercises": [...],
    "studyPlan": [...],
    "areasToFocus": [...]
  },
  "fromCache": false
}
```

### 3. Corregir Examen de Desarrollo

**POST** `/api/ai/grade`

```json
{
  "question": "Pregunta del examen",
  "answer": "Respuesta del estudiante",
  "rubric": "Rúbrica de evaluación (opcional)"
}
```

**Respuesta:**
```json
{
  "success": true,
  "score": 85,
  "feedback": "Retroalimentación detallada...",
  "suggestions": ["Sugerencia 1", "Sugerencia 2"]
}
```

### 4. Estadísticas de IA

**GET** `/api/ai/stats`

Muestra estadísticas de uso de cache y modelos.

## 💾 Sistema de Cache

### Funcionamiento

1. **Primera solicitud**: Se genera contenido con IA y se guarda en cache
2. **Solicitudes siguientes**: Se recupera del cache (75% más rápido y económico)
3. **Expiración**: El cache se limpia automáticamente según TTL configurado

### Tipos de Cache

- **Contenido Generado**: TTL de 30 días
- **Recomendaciones**: TTL de 7 días
- **Limpieza automática**: Diaria a las 2:00 AM

### Estadísticas de Cache

Accede a `/api/ai/stats` para ver:
- Total de entradas en cache
- Uso promedio por entrada
- Modelos utilizados

## 🔧 Optimizaciones Implementadas

### 1. Cache Multi-Nivel
- ✅ Cache de contenido generado
- ✅ Cache de recomendaciones
- ✅ Limpieza automática de expirados

### 2. Modelos Optimizados
- **GPT-3.5-turbo**: Para tareas simples (más económico)
- **GPT-4o-mini**: Para contenido complejo (balance calidad/costo)
- **Selección automática**: Según tipo de contenido

### 3. Reducción de Costos
- **Cache hit rate objetivo**: >75%
- **Ahorro estimado**: 70-80% en llamadas a IA
- **Costo por usuario/mes**: ~$0.08 USD con optimizaciones

## 📊 Monitoreo

### Ver Estadísticas

```bash
# Desde el panel admin
GET /api/admin/dashboard

# Estadísticas específicas de IA
GET /api/ai/stats
```

### Limpiar Cache Manualmente

```bash
# Desde el panel admin
POST /api/admin/jobs/clean-cache
```

## 🚨 Troubleshooting

### Error: "OpenAI API key not found"
- Verifica que `OPENAI_API_KEY` esté en tu `.env`
- Reinicia el servidor después de agregar la variable

### Error: "Rate limit exceeded"
- OpenAI tiene límites de uso
- El cache ayuda a reducir llamadas
- Considera aumentar el TTL del cache

### Cache no funciona
- Verifica conexión a MongoDB
- Revisa logs del servidor
- Ejecuta limpieza manual: `POST /api/admin/jobs/clean-cache`

## 📈 Próximos Pasos (Fase 2)

1. **Implementar RAG**: Cargar documentos NAP y Diseños Curriculares
2. **Fine-tuning**: Entrenar modelo específico para educación argentina
3. **Embeddings**: Búsqueda semántica de contenido similar
4. **Analytics avanzado**: Tracking detallado de uso y costos

## 🔒 Seguridad

- Las API keys nunca se exponen al frontend
- Todas las rutas requieren autenticación
- El cache no almacena información sensible
- Los prompts están optimizados para no incluir datos personales

## 💡 Tips

1. **Ajusta TTL según necesidad**: Contenido que cambia poco → TTL más largo
2. **Monitorea costos**: Revisa `/api/ai/stats` regularmente
3. **Optimiza prompts**: Prompts más específicos = menos tokens = menos costo
4. **Usa cache agresivamente**: El cache es tu mejor amigo para reducir costos

