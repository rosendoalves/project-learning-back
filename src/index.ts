// IMPORTANTE: Cargar variables de entorno PRIMERO
import './config/env'

import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import swaggerUi from 'swagger-ui-express'
// Importar modelos para asegurar que estén registrados
import './models'
import { swaggerSpec } from './config/swagger'
import { startMembershipExpirationJob } from './jobs/membershipExpiration.job'
import { startCacheCleanupJob } from './jobs/cacheCleanup.job'
import authRoutes from './routes/auth.routes'
import courseRoutes from './routes/course.routes'
import examRoutes from './routes/exam.routes'
import statsRoutes from './routes/stats.routes'
import topicRoutes from './routes/topic.routes'
import membershipRoutes from './routes/membership.routes'
import adminRoutes from './routes/admin.routes'
import aiRoutes from './routes/ai.routes'
import chatbotRoutes from './routes/chatbot.routes'
import { checkHealth, quickHealth } from './controllers/health.controller'

// Verificar que las variables críticas estén cargadas
console.log('📋 Variables de entorno cargadas:')
console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Configurada' : '❌ No configurada'}`)
console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? `✅ Configurada (${process.env.OPENAI_API_KEY.length} caracteres)` : '❌ No configurada'}`)
console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Configurada' : '❌ No configurada'}`)

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Plataforma Educativa API Documentation'
}))

// Health check routes (antes de otras rutas para acceso rápido)
app.get('/api/health', checkHealth)
app.get('/api/health/quick', quickHealth)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/courses', courseRoutes)
app.use('/api/exams', examRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/topics', topicRoutes)
app.use('/api/memberships', membershipRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/chatbot', chatbotRoutes)

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || ''

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB')
    console.log(`   Database: ${mongoose.connection.name}`)
    
    // Iniciar jobs programados
    startMembershipExpirationJob()
    startCacheCleanupJob()
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`)
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`)
      console.log(`💚 Health Check: http://localhost:${PORT}/api/health`)
    })
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error)
    process.exit(1)
  })

export default app

