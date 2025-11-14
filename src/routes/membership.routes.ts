import { Router } from 'express'
import {
  getMembershipPlans,
  getCurrentMembership,
  createMembership,
  confirmPayment,
  getMembershipHistory
} from '../controllers/membership.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

/**
 * @swagger
 * /api/memberships/plans:
 *   get:
 *     summary: Obtener planes de membresía disponibles
 *     tags: [Membresías]
 *     responses:
 *       200:
 *         description: Lista de planes disponibles
 */
router.get('/plans', getMembershipPlans)

/**
 * @swagger
 * /api/memberships/current:
 *   get:
 *     summary: Obtener membresía actual del usuario
 *     tags: [Membresías]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Membresía actual
 */
router.get('/current', authenticate, getCurrentMembership)

/**
 * @swagger
 * /api/memberships:
 *   post:
 *     summary: Crear nueva membresía
 *     tags: [Membresías]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [weekly, monthly, quarterly, semiannual, annual]
 *               paymentMethod:
 *                 type: string
 *               transactionId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Membresía creada
 */
router.post('/', authenticate, createMembership)

/**
 * @swagger
 * /api/memberships/payment/confirm:
 *   post:
 *     summary: Confirmar pago y activar membresía
 *     tags: [Membresías]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentId
 *             properties:
 *               paymentId:
 *                 type: string
 *               externalPaymentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pago confirmado
 */
router.post('/payment/confirm', authenticate, confirmPayment)

/**
 * @swagger
 * /api/memberships/history:
 *   get:
 *     summary: Obtener historial de membresías
 *     tags: [Membresías]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historial de membresías
 */
router.get('/history', authenticate, getMembershipHistory)

export default router

