import { Response } from 'express'
import Course from '../models/Course.model'
import Topic from '../models/Topic.model'
import Exam from '../models/Exam.model'
import { AuthRequest } from '../middleware/auth.middleware'

export const getCourses = async (req: AuthRequest, res: Response) => {
  try {
    const courses = await Course.find({
      students: req.userId
    })
      .populate('topics', 'title content order')
      .populate('exams', 'title type description totalPoints')
      .select('-students')

    res.json(courses)
  } catch (error: any) {
    res.status(500).json({ message: 'Error al obtener cursos', error: error.message })
  }
}

export const getCourseById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const course = await Course.findById(id)
      .populate({
        path: 'topics',
        select: 'title content order',
        options: { sort: { order: 1 } }
      })
      .populate({
        path: 'exams',
        select: 'title type description totalPoints questions',
        populate: {
          path: 'questions',
          select: 'question type points order'
        }
      })

    if (!course) {
      return res.status(404).json({ message: 'Curso no encontrado' })
    }

    // Verificar que el estudiante esté inscrito
    if (!course.students.includes(req.userId!)) {
      return res.status(403).json({ message: 'No estás inscrito en este curso' })
    }

    res.json(course)
  } catch (error: any) {
    res.status(500).json({ message: 'Error al obtener curso', error: error.message })
  }
}

export const enrollInCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { courseCode } = req.body

    const course = await Course.findOne({ code: courseCode.toUpperCase() })
    if (!course) {
      return res.status(404).json({ message: 'Curso no encontrado' })
    }

    // Verificar si ya está inscrito
    if (course.students.includes(req.userId!)) {
      return res.status(400).json({ message: 'Ya estás inscrito en este curso' })
    }

    course.students.push(req.userId!)
    await course.save()

    res.json({ message: 'Inscripción exitosa', course })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al inscribirse', error: error.message })
  }
}

