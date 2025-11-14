import crypto from 'crypto'
import mongoose from 'mongoose'
import AIGeneratedContent from '../models/AIGeneratedContent.model'
import AIRecommendation from '../models/AIRecommendation.model'
import { recordCacheHit } from './cache-stats.service'

export interface CacheOptions {
  ttl?: number // Time to live en días
}

/**
 * Genera una clave de cache única basada en los parámetros
 */
export const generateCacheKey = (
  contentType: string,
  courseId: string,
  studentLevel: string,
  context: string,
  additionalParams?: Record<string, any>
): string => {
  const params = {
    contentType,
    courseId,
    studentLevel,
    context,
    ...additionalParams
  }
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(params))
    .digest('hex')
  return `ai_${contentType}_${hash.substring(0, 16)}`
}

/**
 * Genera clave de cache para recomendaciones
 */
export const generateRecommendationCacheKey = (
  studentId: string,
  courseId: string,
  studentProfile: any
): string => {
  const params = {
    studentId,
    courseId,
    progress: studentProfile.progress,
    strengths: studentProfile.strengths?.sort().join(','),
    weaknesses: studentProfile.weaknesses?.sort().join(',')
  }
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(params))
    .digest('hex')
  return `rec_${studentId}_${hash.substring(0, 16)}`
}

/**
 * Genera clave de cache para correcciones de exámenes
 */
export const generateGradingCacheKey = (
  question: string,
  answer: string,
  rubric?: string,
  courseName?: string
): string => {
  const params = {
    question: question.trim().toLowerCase(),
    answer: answer.trim().toLowerCase().substring(0, 500), // Limitar longitud para consistencia
    rubric: rubric?.trim().toLowerCase() || '',
    courseName: courseName?.toLowerCase() || ''
  }
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(params))
    .digest('hex')
  return `grading_${hash.substring(0, 16)}`
}

/**
 * Verifica si existe una corrección en cache
 */
export const checkGradingCache = async (
  cacheKey: string
): Promise<any | null> => {
  try {
    const cached = await AIGeneratedContent.findOne({
      cacheKey,
      'metadata.contentType': 'grading',
      expiresAt: { $gt: new Date() }
    })

    if (cached) {
      // Incrementar contador de uso
      cached.metadata.usageCount += 1
      await cached.save()
      // Registrar cache hit
      recordCacheHit('grading', cacheKey)
      // Extraer el resultado de grading del formato almacenado
      if (cached.content && cached.content.metadata) {
        return {
          score: cached.content.metadata.score,
          feedback: cached.content.metadata.feedback || cached.content.body,
          suggestions: cached.content.metadata.suggestions || cached.content.learningObjectives
        }
      }
      return cached.content
    }

    return null
  } catch (error) {
    console.error('Error checking grading cache:', error)
    return null
  }
}

/**
 * Guarda una corrección en cache
 */
export const saveGradingCache = async (
  cacheKey: string,
  gradingResult: {
    score: number
    feedback: string
    suggestions: string[]
  },
  courseId?: string | mongoose.Types.ObjectId,
  tokensUsed?: number,
  ttl: number = 30 // 30 días por defecto
): Promise<void> => {
  try {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + ttl)

    // Validar que courseId sea un ObjectId válido o null
    let validCourseId: mongoose.Types.ObjectId | null = null
    if (courseId) {
      // Si es un string, verificar que sea un ObjectId válido
      if (typeof courseId === 'string' && mongoose.Types.ObjectId.isValid(courseId)) {
        validCourseId = new mongoose.Types.ObjectId(courseId)
      } else if (courseId instanceof mongoose.Types.ObjectId) {
        validCourseId = courseId
      }
      // Si no es válido, dejamos null (no es crítico para el cache)
    }

    // Para grading, el content tiene una estructura diferente
    await AIGeneratedContent.findOneAndUpdate(
      { cacheKey },
      {
        cacheKey,
        contentType: 'grading',
        courseId: validCourseId,
        topicId: null,
        content: {
          title: 'Corrección de Examen',
          body: gradingResult.feedback,
          learningObjectives: gradingResult.suggestions || [],
          difficulty: 'intermediate' as const,
          metadata: {
            score: gradingResult.score,
            feedback: gradingResult.feedback,
            suggestions: gradingResult.suggestions
          }
        },
        metadata: {
          studentLevel: 'secondary',
          context: 'exam_grading',
          generatedAt: new Date(),
          usageCount: 1,
          tokensUsed: tokensUsed || 0,
          modelUsed: 'gpt-4o-mini'
        },
        expiresAt
      },
      { upsert: true, new: true }
    )
  } catch (error) {
    console.error('Error saving grading cache:', error)
    // No lanzar error, el cache es opcional
  }
}

/**
 * Verifica si existe contenido en cache y no ha expirado
 */
export const checkContentCache = async (
  cacheKey: string
): Promise<any | null> => {
  try {
    const cached = await AIGeneratedContent.findOne({
      cacheKey,
      expiresAt: { $gt: new Date() }
    })

    if (cached) {
      // Incrementar contador de uso
      cached.metadata.usageCount += 1
      await cached.save()
      // Registrar cache hit
      recordCacheHit(cached.contentType, cacheKey)
      return cached
    }

    return null
  } catch (error) {
    console.error('Error checking content cache:', error)
    return null
  }
}

/**
 * Guarda contenido generado en cache
 */
export const saveContentCache = async (
  cacheKey: string,
  contentType: string,
  courseId: string,
  topicId: string | undefined,
  content: any,
  metadata: {
    studentLevel: string
    context: string
    tokensUsed?: number
    modelUsed?: string
  },
  ttl: number = 30 // 30 días por defecto
): Promise<void> => {
  try {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + ttl)

    await AIGeneratedContent.findOneAndUpdate(
      { cacheKey },
      {
        contentType,
        courseId,
        topicId,
        content,
        metadata: {
          ...metadata,
          generatedAt: new Date(),
          usageCount: 0
        },
        expiresAt
      },
      { upsert: true, new: true }
    )
  } catch (error) {
    console.error('Error saving content cache:', error)
  }
}

/**
 * Verifica si existe recomendación en cache
 */
export const checkRecommendationCache = async (
  cacheKey: string
): Promise<any | null> => {
  try {
    const cached = await AIRecommendation.findOne({
      cacheKey,
      expiresAt: { $gt: new Date() }
    })

    if (cached) {
      // Actualizar último uso
      cached.metadata.lastUsed = new Date()
      await cached.save()
      // Registrar cache hit
      recordCacheHit('recommendation', cacheKey)
      return cached
    }

    return null
  } catch (error) {
    console.error('Error checking recommendation cache:', error)
    return null
  }
}

/**
 * Guarda recomendación en cache
 */
export const saveRecommendationCache = async (
  cacheKey: string,
  studentId: string,
  courseId: string,
  recommendations: any,
  studentProfile: any,
  tokensUsed?: number,
  modelUsed?: string,
  ttl: number = 7 // 7 días por defecto
): Promise<void> => {
  try {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + ttl)

    await AIRecommendation.findOneAndUpdate(
      { cacheKey },
      {
        studentId,
        courseId,
        recommendations,
        metadata: {
          studentProfile,
          generatedAt: new Date(),
          lastUsed: new Date(),
          tokensUsed,
          modelUsed
        },
        expiresAt
      },
      { upsert: true, new: true }
    )
  } catch (error) {
    console.error('Error saving recommendation cache:', error)
  }
}

/**
 * Limpia cache expirado (para ejecutar periódicamente)
 */
export const cleanExpiredCache = async (): Promise<number> => {
  try {
    const now = new Date()
    const result = await Promise.all([
      AIGeneratedContent.deleteMany({ expiresAt: { $lt: now } }),
      AIRecommendation.deleteMany({ expiresAt: { $lt: now } })
    ])
    return result[0].deletedCount + result[1].deletedCount
  } catch (error) {
    console.error('Error cleaning expired cache:', error)
    return 0
  }
}

/**
 * Obtiene estadísticas de cache
 */
export const getCacheStats = async () => {
  try {
    const [contentStats, recommendationStats] = await Promise.all([
      AIGeneratedContent.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalUsage: { $sum: '$metadata.usageCount' },
            avgUsage: { $avg: '$metadata.usageCount' }
          }
        }
      ]),
      AIRecommendation.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 }
          }
        }
      ])
    ])

    return {
      content: {
        total: contentStats[0]?.total || 0,
        totalUsage: contentStats[0]?.totalUsage || 0,
        avgUsage: contentStats[0]?.avgUsage || 0
      },
      recommendations: {
        total: recommendationStats[0]?.total || 0
      }
    }
  } catch (error) {
    console.error('Error getting cache stats:', error)
    return null
  }
}

