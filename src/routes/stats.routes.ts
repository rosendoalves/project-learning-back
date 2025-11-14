import { Router } from 'express'
import { getStudentStats } from '../controllers/stats.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requireActiveMembership } from '../middleware/membership.middleware'

const router = Router()

/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: Obtener estadísticas del estudiante
 *     tags: [Estadísticas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas del estudiante
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overall:
 *                   type: object
 *                   properties:
 *                     totalCourses:
 *                       type: number
 *                     totalExams:
 *                       type: number
 *                     completedExams:
 *                       type: number
 *                     examsPercentage:
 *                       type: number
 *                     averageScore:
 *                       type: number
 *                     averageCourseCompletion:
 *                       type: number
 *                 byCourse:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       courseId:
 *                         type: string
 *                       courseName:
 *                         type: string
 *                       topicsCompleted:
 *                         type: number
 *                       totalTopics:
 *                         type: number
 *                       topicsPercentage:
 *                         type: number
 *                       examsCompleted:
 *                         type: number
 *                       totalExams:
 *                         type: number
 *                       examsPercentage:
 *                         type: number
 *                       averageScore:
 *                         type: number
 *                       averagePercentage:
 *                         type: number
 *       401:
 *         description: No autenticado
 */
router.get('/', authenticate, requireActiveMembership, getStudentStats)

export default router

