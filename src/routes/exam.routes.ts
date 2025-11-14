import { Router } from 'express'
import {
  getExamById,
  submitAnswer,
  submitExam,
  getExamResult
} from '../controllers/exam.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requireActiveMembership } from '../middleware/membership.middleware'

const router = Router()

/**
 * @swagger
 * /api/exams/{examId}:
 *   get:
 *     summary: Obtener un examen por ID
 *     tags: [Exámenes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del examen
 *     responses:
 *       200:
 *         description: Detalle del examen
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Exam'
 *       404:
 *         description: Examen no encontrado
 *       403:
 *         description: No tienes acceso a este examen
 */
router.get('/:examId', authenticate, requireActiveMembership, getExamById)

/**
 * @swagger
 * /api/exams/answer:
 *   post:
 *     summary: Enviar respuesta a una pregunta
 *     tags: [Exámenes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - examId
 *               - questionId
 *               - answer
 *             properties:
 *               examId:
 *                 type: string
 *               questionId:
 *                 type: string
 *               answer:
 *                 oneOf:
 *                   - type: string
 *                   - type: number
 *                 description: Respuesta (string para desarrollo, número índice para multiple-choice)
 *     responses:
 *       200:
 *         description: Respuesta guardada
 *       400:
 *         description: Faltan datos requeridos o la pregunta no pertenece al examen
 *       404:
 *         description: Examen o pregunta no encontrada
 */
router.post('/answer', authenticate, requireActiveMembership, submitAnswer)

/**
 * @swagger
 * /api/exams/{examId}/submit:
 *   post:
 *     summary: Enviar examen completo
 *     tags: [Exámenes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del examen
 *     responses:
 *       200:
 *         description: Examen enviado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 result:
 *                   type: object
 *                   properties:
 *                     totalScore:
 *                       type: number
 *                     maxScore:
 *                       type: number
 *                     percentage:
 *                       type: number
 *                 needsAIGrading:
 *                   type: boolean
 *       404:
 *         description: Examen no encontrado
 */
router.post('/:examId/submit', authenticate, requireActiveMembership, submitExam)

/**
 * @swagger
 * /api/exams/{examId}/result:
 *   get:
 *     summary: Obtener resultado de un examen
 *     tags: [Exámenes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del examen
 *     responses:
 *       200:
 *         description: Resultado del examen
 *       404:
 *         description: Resultado no encontrado
 */
router.get('/:examId/result', authenticate, requireActiveMembership, getExamResult)

export default router

