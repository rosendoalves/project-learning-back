import { Response } from 'express'
import mongoose from 'mongoose'
import OpenAI from 'openai'

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Verifica el estado completo de los servicios (MongoDB y OpenAI)
 *     tags: [Health]
 *     description: Realiza verificaciones completas de conexión a MongoDB y OpenAI, incluyendo latencia
 *     responses:
 *       200:
 *         description: Todos los servicios están funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 services:
 *                   type: object
 *                   properties:
 *                     mongodb:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: connected
 *                         message:
 *                           type: string
 *                         latency:
 *                           type: number
 *                     openai:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: connected
 *                         message:
 *                           type: string
 *                         latency:
 *                           type: number
 *                 uptime:
 *                   type: number
 *       503:
 *         description: Uno o más servicios no están disponibles
 */
export const checkHealth = async (req: any, res: Response) => {
  const healthStatus = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: {
        status: 'unknown',
        message: '',
        latency: 0
      },
      openai: {
        status: 'unknown',
        message: '',
        latency: 0
      }
    },
    uptime: process.uptime()
  }

  // Verificar MongoDB
  try {
    const mongoStart = Date.now()
    const mongoState = mongoose.connection.readyState
    
    // Estados: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    if (mongoState === 1) {
      // Hacer un ping simple para verificar latencia
      await mongoose.connection.db.admin().ping()
      const mongoLatency = Date.now() - mongoStart
      
      healthStatus.services.mongodb = {
        status: 'connected',
        message: `MongoDB está conectado (${mongoose.connection.name})`,
        latency: mongoLatency
      }
    } else {
      healthStatus.services.mongodb = {
        status: 'disconnected',
        message: `MongoDB no está conectado (estado: ${mongoState})`,
        latency: 0
      }
      healthStatus.status = 'DEGRADED'
    }
  } catch (error: any) {
    healthStatus.services.mongodb = {
      status: 'error',
      message: `Error al verificar MongoDB: ${error.message}`,
      latency: 0
    }
    healthStatus.status = 'DEGRADED'
  }

  // Verificar OpenAI
  try {
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      console.log('⚠️  OpenAI: API Key no configurada')
      healthStatus.services.openai = {
        status: 'not_configured',
        message: 'OPENAI_API_KEY no está configurada en las variables de entorno',
        latency: 0
      }
      healthStatus.status = 'DEGRADED'
    } else {
      const openaiStart = Date.now()
      const openai = new OpenAI({
        apiKey: openaiKey
      })

      console.log('🔄 Verificando conexión con OpenAI...')
      
      // Hacer una petición simple para verificar que la API key funciona
      // Usamos models.list() que es una petición ligera
      await openai.models.list()
      const openaiLatency = Date.now() - openaiStart

      console.log(`✅ OpenAI: Conectado correctamente (latencia: ${openaiLatency}ms)`)
      console.log(`   Modelo configurado: ${process.env.OPENAI_GRADING_MODEL || 'gpt-4o-mini'}`)

      healthStatus.services.openai = {
        status: 'connected',
        message: 'OpenAI API está funcionando correctamente',
        latency: openaiLatency
      }
    }
  } catch (error: any) {
    console.error('❌ OpenAI: Error al conectar:', error.message)
    healthStatus.services.openai = {
      status: 'error',
      message: `Error al verificar OpenAI: ${error.message}`,
      latency: 0
    }
    healthStatus.status = 'DEGRADED'
  }

  // Determinar código de estado HTTP
  const httpStatus = healthStatus.status === 'OK' ? 200 : 503

  res.status(httpStatus).json(healthStatus)
}

/**
 * @swagger
 * /api/health/quick:
 *   get:
 *     summary: Verificación rápida del estado (sin llamadas a servicios externos)
 *     tags: [Health]
 *     description: Verificación rápida que solo comprueba el estado de conexión sin hacer peticiones a servicios externos
 *     responses:
 *       200:
 *         description: Estado básico del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 mongodb:
 *                   type: string
 *                   example: connected
 *                 openai:
 *                   type: string
 *                   example: configured
 *                 uptime:
 *                   type: number
 *       503:
 *         description: Servicios no configurados o desconectados
 */
export const quickHealth = (req: any, res: Response) => {
  const mongoState = mongoose.connection.readyState
  const mongoConnected = mongoState === 1
  const openaiConfigured = !!process.env.OPENAI_API_KEY

  const status = mongoConnected && openaiConfigured ? 'OK' : 'DEGRADED'

  res.status(status === 'OK' ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    mongodb: mongoConnected ? 'connected' : 'disconnected',
    openai: openaiConfigured ? 'configured' : 'not_configured',
    uptime: process.uptime()
  })
}

