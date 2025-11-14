import { Router } from 'express'
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getAllMemberships,
  updateMembership,
  getDashboardStats,
  getAIUsageStats
} from '../controllers/admin.controller'
import { authenticate, requireRole } from '../middleware/auth.middleware'

const router = Router()

// Todas las rutas requieren autenticación y rol de admin
router.use(authenticate)
router.use(requireRole('admin'))

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Obtener estadísticas del dashboard
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas del dashboard
 */
router.get('/dashboard', getDashboardStats)

/**
 * @swagger
 * /api/admin/ai-usage:
 *   get:
 *     summary: Obtener estadísticas de uso de OpenAI
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Período en días (7, 30, 90, 180)
 *     responses:
 *       200:
 *         description: Estadísticas de uso de IA
 */
router.get('/ai-usage', getAIUsageStats)

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Obtener todos los usuarios (con paginación)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de usuarios
 */
router.get('/users', getAllUsers)

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Obtener usuario por ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalle del usuario
 */
router.get('/users/:id', getUserById)

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Crear nuevo usuario
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               email:
 *                 type: string
 *               fullName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [student, teacher, admin]
 *     responses:
 *       201:
 *         description: Usuario creado
 */
router.post('/users', createUser)

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     summary: Actualizar usuario
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               fullName:
 *                 type: string
 *               role:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuario actualizado
 */
router.put('/users/:id', updateUser)

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Eliminar usuario
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuario eliminado
 */
router.delete('/users/:id', deleteUser)

/**
 * @swagger
 * /api/admin/memberships:
 *   get:
 *     summary: Obtener todas las membresías
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de membresías
 */
router.get('/memberships', getAllMemberships)

/**
 * @swagger
 * /api/admin/memberships/{id}:
 *   put:
 *     summary: Actualizar membresía
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, expired, cancelled, pending]
 *               endDate:
 *                 type: string
 *                 format: date
 *               autoRenew:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Membresía actualizada
 */
router.put('/memberships/:id', updateMembership)

/**
 * @swagger
 * /api/admin/jobs/expire-memberships:
 *   post:
 *     summary: Ejecutar manualmente el job de expiración de membresías
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Job ejecutado exitosamente
 */
router.post('/jobs/expire-memberships', async (req, res) => {
  try {
    const result = await runMembershipExpirationJob()
    res.json({
      message: 'Job ejecutado exitosamente',
      ...result
    })
  } catch (error: any) {
    res.status(500).json({
      message: 'Error al ejecutar job',
      error: error.message
    })
  }
})

/**
 * @swagger
 * /api/admin/jobs/clean-cache:
 *   post:
 *     summary: Ejecutar limpieza manual de cache expirado
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache limpiado exitosamente
 */
router.post('/jobs/clean-cache', async (req, res) => {
  try {
    const result = await runCacheCleanup()
    res.json({
      message: 'Limpieza de cache ejecutada exitosamente',
      ...result
    })
  } catch (error: any) {
    res.status(500).json({
      message: 'Error al limpiar cache',
      error: error.message
    })
  }
})

export default router

