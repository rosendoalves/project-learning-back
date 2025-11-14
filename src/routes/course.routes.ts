import { Router } from 'express'
import { getCourses, getCourseById, enrollInCourse } from '../controllers/course.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requireActiveMembership } from '../middleware/membership.middleware'

const router = Router()

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: Obtener todos los cursos del estudiante
 *     tags: [Cursos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de cursos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 *       401:
 *         description: No autenticado
 */
router.get('/', authenticate, requireActiveMembership, getCourses)

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: Obtener detalle de un curso
 *     tags: [Cursos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del curso
 *     responses:
 *       200:
 *         description: Detalle del curso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       404:
 *         description: Curso no encontrado
 *       403:
 *         description: No estás inscrito en este curso
 */
router.get('/:id', authenticate, requireActiveMembership, getCourseById)

/**
 * @swagger
 * /api/courses/enroll:
 *   post:
 *     summary: Inscribirse en un curso
 *     tags: [Cursos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseCode
 *             properties:
 *               courseCode:
 *                 type: string
 *                 example: MAT3
 *     responses:
 *       200:
 *         description: Inscripción exitosa
 *       404:
 *         description: Curso no encontrado
 *       400:
 *         description: Ya estás inscrito en este curso
 */
router.post('/enroll', authenticate, requireActiveMembership, enrollInCourse)

export default router

