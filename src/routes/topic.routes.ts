import { Router } from 'express'
import { getTopicById, markTopicAsViewed, markTopicAsCompleted } from '../controllers/topic.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requireActiveMembership } from '../middleware/membership.middleware'

const router = Router()

/**
 * @swagger
 * /api/topics/{topicId}:
 *   get:
 *     summary: Obtener detalle de un tema
 *     tags: [Temas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del tema
 *     responses:
 *       200:
 *         description: Detalle del tema con progreso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topic:
 *                   $ref: '#/components/schemas/Topic'
 *                 progress:
 *                   type: object
 *                   properties:
 *                     viewed:
 *                       type: boolean
 *                     completed:
 *                       type: boolean
 *                     viewedAt:
 *                       type: string
 *                       format: date-time
 *                     completedAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Tema no encontrado
 *       403:
 *         description: No tienes acceso a este tema
 */
router.get('/:topicId', authenticate, requireActiveMembership, getTopicById)

/**
 * @swagger
 * /api/topics/{topicId}/view:
 *   post:
 *     summary: Marcar tema como visto
 *     tags: [Temas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del tema
 *     responses:
 *       200:
 *         description: Tema marcado como visto
 *       404:
 *         description: Tema no encontrado
 *       403:
 *         description: No tienes acceso a este tema
 */
router.post('/:topicId/view', authenticate, requireActiveMembership, markTopicAsViewed)

/**
 * @swagger
 * /api/topics/{topicId}/complete:
 *   post:
 *     summary: Marcar tema como completado
 *     tags: [Temas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del tema
 *     responses:
 *       200:
 *         description: Tema marcado como completado
 *       404:
 *         description: Tema no encontrado
 *       403:
 *         description: No tienes acceso a este tema
 */
router.post('/:topicId/complete', authenticate, requireActiveMembership, markTopicAsCompleted)

export default router

