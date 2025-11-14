import { Router } from 'express'
import {
  generateContent,
  getRecommendations,
  gradeExam,
  getStats
} from '../controllers/ai.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requireActiveMembership } from '../middleware/membership.middleware'

const router = Router()

// Todas las rutas requieren autenticación y membresía activa
router.use(authenticate)
router.use(requireActiveMembership)

/**
 * @swagger
 * /api/ai/generate:
 *   post:
 *     summary: Generar contenido educativo personalizado con IA
 *     tags: [IA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contentType
 *               - courseId
 *               - studentLevel
 *               - context
 *             properties:
 *               contentType:
 *                 type: string
 *                 enum: [syllabus, topic, exercise, explanation]
 *               courseId:
 *                 type: string
 *               topicId:
 *                 type: string
 *               studentLevel:
 *                 type: string
 *               context:
 *                 type: string
 *               additionalParams:
 *                 type: object
 *     responses:
 *       200:
 *         description: Contenido generado exitosamente
 *       400:
 *         description: Faltan parámetros requeridos
 */
router.post('/generate', generateContent)

/**
 * @swagger
 * /api/ai/recommendations/{courseId}:
 *   get:
 *     summary: Obtener recomendaciones personalizadas para un curso
 *     tags: [IA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recomendaciones generadas
 */
router.get('/recommendations/:courseId', getRecommendations)

/**
 * @swagger
 * /api/ai/grade:
 *   post:
 *     summary: Corregir examen de desarrollo usando IA
 *     tags: [IA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - answer
 *             properties:
 *               question:
 *                 type: string
 *               answer:
 *                 type: string
 *               rubric:
 *                 type: string
 *     responses:
 *       200:
 *         description: Examen corregido exitosamente
 */
router.post('/grade', gradeExam)

/**
 * @swagger
 * /api/ai/stats:
 *   get:
 *     summary: Obtener estadísticas de uso de IA
 *     tags: [IA]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas de IA
 */
router.get('/stats', getStats)

export default router

