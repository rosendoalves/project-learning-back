import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import Topic from '../models/Topic.model'
import TopicProgress from '../models/TopicProgress.model'
import Course from '../models/Course.model'

export const getTopicById = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' })
    }

    const { topicId } = req.params

    const topic = await Topic.findById(topicId).populate('course', 'name code')
    if (!topic) {
      return res.status(404).json({ message: 'Tema no encontrado' })
    }

    // Verificar que el estudiante esté inscrito en el curso
    const course = await Course.findById(topic.course)
    if (!course || !course.students.includes(req.userId)) {
      return res.status(403).json({ message: 'No tienes acceso a este tema' })
    }

    // Obtener o crear progreso
    let progress = await TopicProgress.findOne({
      student: req.userId,
      topic: topicId
    })

    if (!progress) {
      progress = new TopicProgress({
        student: req.userId,
        topic: topicId,
        course: topic.course,
        viewed: false,
        completed: false
      })
      await progress.save()
    }

    res.json({
      topic,
      progress: {
        viewed: progress.viewed,
        completed: progress.completed,
        viewedAt: progress.viewedAt,
        completedAt: progress.completedAt
      }
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al obtener tema', error: error.message })
  }
}

export const markTopicAsViewed = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' })
    }

    const { topicId } = req.params

    const topic = await Topic.findById(topicId)
    if (!topic) {
      return res.status(404).json({ message: 'Tema no encontrado' })
    }

    // Verificar que el estudiante esté inscrito
    const course = await Course.findById(topic.course)
    if (!course || !course.students.includes(req.userId)) {
      return res.status(403).json({ message: 'No tienes acceso a este tema' })
    }

    // Buscar o crear progreso
    let progress = await TopicProgress.findOne({
      student: req.userId,
      topic: topicId
    })

    if (!progress) {
      progress = new TopicProgress({
        student: req.userId,
        topic: topicId,
        course: topic.course,
        viewed: true,
        viewedAt: new Date(),
        completed: false
      })
    } else {
      progress.viewed = true
      if (!progress.viewedAt) {
        progress.viewedAt = new Date()
      }
    }

    await progress.save()

    res.json({
      message: 'Tema marcado como visto',
      progress
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al marcar tema', error: error.message })
  }
}

export const markTopicAsCompleted = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' })
    }

    const { topicId } = req.params

    const topic = await Topic.findById(topicId)
    if (!topic) {
      return res.status(404).json({ message: 'Tema no encontrado' })
    }

    // Verificar que el estudiante esté inscrito
    const course = await Course.findById(topic.course)
    if (!course || !course.students.includes(req.userId)) {
      return res.status(403).json({ message: 'No tienes acceso a este tema' })
    }

    // Buscar o crear progreso
    let progress = await TopicProgress.findOne({
      student: req.userId,
      topic: topicId
    })

    if (!progress) {
      progress = new TopicProgress({
        student: req.userId,
        topic: topicId,
        course: topic.course,
        viewed: true,
        viewedAt: new Date(),
        completed: true,
        completedAt: new Date()
      })
    } else {
      progress.viewed = true
      progress.completed = true
      if (!progress.viewedAt) {
        progress.viewedAt = new Date()
      }
      if (!progress.completedAt) {
        progress.completedAt = new Date()
      }
    }

    await progress.save()

    res.json({
      message: 'Tema marcado como completado',
      progress
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al marcar tema', error: error.message })
  }
}

