# Backend - Plataforma Educativa

Backend desarrollado con Node.js, Express y TypeScript para la plataforma educativa.

## Características

- 🔐 Autenticación con JWT
- 📚 Gestión de cursos y temas
- ✍️ Sistema de exámenes (múltiple choice y desarrollo)
- 🤖 Preparado para corrección por IA
- 🗄️ Base de datos MongoDB
- 📖 Documentación Swagger/OpenAPI
- 🐳 Docker support

## Instalación

### Instalación Local

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
Crear archivo `.env`:
```
PORT=3000
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/database?retryWrites=true&w=majority
JWT_SECRET=tu_secreto_jwt_super_seguro_cambiar_en_produccion
NODE_ENV=development
```

3. Ejecutar seed para poblar la base de datos:
```bash
npm run seed
```

4. Iniciar servidor en desarrollo:
```bash
npm run dev
```

### Instalación con Docker

#### Desarrollo

1. Crear archivo `.env` con las variables de entorno necesarias

2. Ejecutar con docker-compose:
```bash
docker-compose up
```

#### Producción

1. Construir la imagen:
```bash
docker build -t plataforma-educativa-backend .
```

2. Ejecutar el contenedor:
```bash
docker run -d \
  -p 3000:3000 \
  --name plataforma-backend \
  --env-file .env \
  plataforma-educativa-backend
```

## Scripts

- `npm run dev` - Inicia el servidor en modo desarrollo con hot reload
- `npm run build` - Compila TypeScript a JavaScript
- `npm start` - Inicia el servidor en producción
- `npm run seed` - Pobla la base de datos con datos de prueba
- `npm run lint` - Ejecuta el linter

## Documentación API

Una vez que el servidor esté corriendo, accede a la documentación Swagger en:

**http://localhost:3000/api-docs**

La documentación incluye:
- Descripción de todos los endpoints
- Esquemas de datos
- Ejemplos de requests y responses
- Posibilidad de probar los endpoints directamente desde el navegador

## Estructura del Proyecto

```
src/
├── config/
│   └── swagger.ts          # Configuración de Swagger
├── controllers/            # Lógica de negocio
├── models/                 # Modelos de MongoDB/Mongoose
├── routes/                 # Definición de rutas
├── middleware/             # Middleware (autenticación, etc.)
├── scripts/                # Scripts (seed, etc.)
└── index.ts                # Punto de entrada
```

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/profile` - Obtener perfil (requiere autenticación)

### Cursos
- `GET /api/courses` - Obtener cursos del estudiante
- `GET /api/courses/:id` - Obtener detalle de un curso
- `POST /api/courses/enroll` - Inscribirse en un curso

### Temas
- `GET /api/topics/:topicId` - Obtener tema con progreso
- `POST /api/topics/:topicId/view` - Marcar tema como visto
- `POST /api/topics/:topicId/complete` - Marcar tema como completado

### Exámenes
- `GET /api/exams/:examId` - Obtener examen
- `POST /api/exams/answer` - Enviar respuesta a una pregunta
- `POST /api/exams/:examId/submit` - Enviar examen completo
- `GET /api/exams/:examId/result` - Obtener resultado del examen

### Estadísticas
- `GET /api/stats` - Obtener estadísticas del estudiante

## Modelos de Datos

- **User**: Usuarios (estudiantes, profesores, admin)
- **Course**: Cursos
- **Topic**: Temas de los cursos
- **TopicProgress**: Progreso de temas por estudiante
- **Exam**: Exámenes
- **Question**: Preguntas de los exámenes
- **Answer**: Respuestas de los estudiantes
- **ExamResult**: Resultados completos de exámenes

## Variables de Entorno

```
PORT=3000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=tu_secreto_jwt
NODE_ENV=development
```

## Docker

### Desarrollo
```bash
docker-compose up
```

### Producción
```bash
docker build -t plataforma-educativa-backend .
docker run -d -p 3000:3000 --env-file .env plataforma-educativa-backend
```

## Próximos Pasos

- Integración con IA para corrección de exámenes de desarrollo
- Generación automática de temarios con IA
- Sistema de notificaciones
- Dashboard para profesores
# project-learning-back
