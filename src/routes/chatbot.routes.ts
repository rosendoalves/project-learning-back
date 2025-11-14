import { Router } from 'express'
import { checkChatbotEnabled, sendMessage } from '../controllers/chatbot.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requireActiveMembership } from '../middleware/membership.middleware'

const router = Router()

/**
 * @swagger
 * /api/chatbot/status:
 *   get:
 *     summary: Verificar si el chatbot está habilitado
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estado del chatbot
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 */
router.get('/status', authenticate, checkChatbotEnabled)

/**
 * @swagger
 * /api/chatbot/message:
 *   post:
 *     summary: Enviar mensaje al chatbot
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *               courseId:
 *                 type: string
 *                 description: ID del curso para contexto (opcional)
 *     responses:
 *       200:
 *         description: Respuesta del chatbot
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 fromCache:
 *                   type: boolean
 *       403:
 *         description: Chatbot deshabilitado
 */
router.post('/message', authenticate, requireActiveMembership, sendMessage)

export default router

