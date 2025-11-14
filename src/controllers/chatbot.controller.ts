import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { chatWithAI } from '../services/chatbot.service'
import Feature from '../models/Feature.model'
import Course from '../models/Course.model'

/**
 * Verifica si el chatbot está habilitado
 */
export const checkChatbotEnabled = async (req: AuthRequest, res: Response) => {
  try {
    const feature = await Feature.findOne({ name: 'chatbot' })
    res.json({
      enabled: feature?.enabled ?? false
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al verificar feature', error: error.message })
  }
}

/**
 * Envía un mensaje al chatbot
 */
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    // Verificar si el chatbot está habilitado
    const feature = await Feature.findOne({ name: 'chatbot' })
    if (!feature || !feature.enabled) {
      return res.status(403).json({
        message: 'El chatbot no está disponible en este momento',
        code: 'FEATURE_DISABLED'
      })
    }

    const { message, courseId } = req.body

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'El mensaje no puede estar vacío' })
    }

    // Obtener información del curso si se proporciona
    let courseContext: { name: string; description?: string; code?: string } | undefined = undefined
    if (courseId) {
      const course = await Course.findById(courseId).select('name description code')
      if (course) {
        courseContext = {
          name: course.name,
          description: course.description,
          code: course.code
        }
      }
    }

    // Enviar mensaje al chatbot
    const response = await chatWithAI(
      message,
      req.userId || '',
      courseContext
    )

    res.json({
      message: response.message,
      fromCache: response.fromCache
    })
  } catch (error: any) {
    console.error('Error en chatbot:', error)
    res.status(500).json({
      message: 'Error al procesar el mensaje',
      error: error.message
    })
  }
}

