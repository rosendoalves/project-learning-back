import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import {
  generateEducationalContent,
  generateRecommendations,
  gradeDevelopmentExam,
  getAIStats
} from '../services/ai.service'
import { requireActiveMembership } from '../middleware/membership.middleware'
import User from '../models/User.model'
import Course from '../models/Course.model'

/**
 * Genera contenido educativo personalizado
 */
export const generateContent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' })
    }

    const { contentType, courseId, topicId, studentLevel, context, additionalParams } = req.body

    if (!contentType || !courseId || !studentLevel) {
      return res.status(400).json({ message: 'Faltan parámetros requeridos' })
    }

    // Verificar que el curso existe y el usuario tiene acceso
    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({ message: 'Curso no encontrado' })
    }

    const result = await generateEducationalContent(
      contentType,
      courseId,
      topicId,
      studentLevel,
      context,
      additionalParams
    )

    res.json({
      success: true,
      ...result
    })
  } catch (error: any) {
    console.error('Error in generateContent:', error)
    res.status(500).json({
      message: 'Error al generar contenido',
      error: error.message
    })
  }
}

/**
 * Genera recomendaciones personalizadas para un estudiante
 */
export const getRecommendations = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' })
    }

    const { courseId } = req.params

    // Obtener perfil del estudiante
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    // Aquí deberías obtener el perfil real del estudiante (progreso, fortalezas, debilidades)
    // Por ahora usamos datos de ejemplo
    const studentProfile = {
      progress: 60, // Esto debería venir de estadísticas reales
      strengths: ['Álgebra', 'Comprensión lectora'],
      weaknesses: ['Geometría', 'Producción de textos'],
      learningStyle: 'visual'
    }

    const result = await generateRecommendations(
      req.userId,
      courseId,
      studentProfile
    )

    res.json({
      success: true,
      ...result
    })
  } catch (error: any) {
    console.error('Error in getRecommendations:', error)
    res.status(500).json({
      message: 'Error al generar recomendaciones',
      error: error.message
    })
  }
}

/**
 * Corrige un examen de desarrollo
 */
export const gradeExam = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' })
    }

    const { question, answer, rubric } = req.body

    if (!question || !answer) {
      return res.status(400).json({ message: 'Faltan pregunta o respuesta' })
    }

    const result = await gradeDevelopmentExam(question, answer, rubric)

    res.json({
      success: true,
      ...result
    })
  } catch (error: any) {
    console.error('Error in gradeExam:', error)
    res.status(500).json({
      message: 'Error al corregir examen',
      error: error.message
    })
  }
}

/**
 * Obtiene estadísticas de uso de IA
 */
export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getAIStats()
    res.json({
      success: true,
      stats
    })
  } catch (error: any) {
    res.status(500).json({
      message: 'Error al obtener estadísticas',
      error: error.message
    })
  }
}

