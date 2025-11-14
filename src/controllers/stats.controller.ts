import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import Course from '../models/Course.model'
import ExamResult from '../models/ExamResult.model'
import Exam from '../models/Exam.model'
import Topic from '../models/Topic.model'
import TopicProgress from '../models/TopicProgress.model'

export const getStudentStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' })
    }

    // Obtener todos los cursos del estudiante
    const courses = await Course.find({
      students: req.userId
    }).populate('topics').populate('exams')

    // Calcular estadísticas por curso
    const courseStats = await Promise.all(
      courses.map(async (course) => {
        // Obtener progreso de temas del estudiante
        const topicProgresses = await TopicProgress.find({
          student: req.userId,
          course: course._id,
          completed: true
        })

        const totalTopics = course.topics.length
        const topicsCompleted = topicProgresses.length
        const topicsPercentage = totalTopics > 0 ? (topicsCompleted / totalTopics) * 100 : 0

        // Obtener resultados de exámenes del estudiante para este curso
        const examResults = await ExamResult.find({
          student: req.userId,
          exam: { $in: course.exams }
        }).populate('exam')

        // Calcular estadísticas de exámenes
        const totalExams = course.exams.length
        const examsCompleted = examResults.length
        const examsPercentage = totalExams > 0 ? (examsCompleted / totalExams) * 100 : 0

        // Calcular promedio de notas
        const gradedExams = examResults.filter((er: any) => er.status === 'graded')
        const totalScore = gradedExams.reduce((sum: number, er: any) => sum + (er.totalScore || 0), 0)
        const maxScore = gradedExams.reduce((sum: number, er: any) => sum + (er.maxScore || 0), 0)
        const averageScore = gradedExams.length > 0 && maxScore > 0 
          ? (totalScore / maxScore) * 100 
          : 0

        // Promedio de porcentajes
        const averagePercentage = gradedExams.length > 0
          ? gradedExams.reduce((sum: number, er: any) => sum + (er.percentage || 0), 0) / gradedExams.length
          : 0

        return {
          courseId: course._id,
          courseName: course.name,
          topicsCompleted,
          totalTopics,
          topicsPercentage: Math.round(topicsPercentage),
          examsCompleted,
          totalExams,
          examsPercentage: Math.round(examsPercentage),
          averageScore: Math.round(averageScore),
          averagePercentage: Math.round(averagePercentage),
          examResults: examResults.map((er: any) => ({
            examId: er.exam._id,
            examTitle: er.exam.title,
            score: er.totalScore,
            maxScore: er.maxScore,
            percentage: er.percentage,
            status: er.status
          }))
        }
      })
    )

    // Calcular estadísticas generales
    const allExamResults = await ExamResult.find({
      student: req.userId
    }).populate('exam')

    const allGradedExams = allExamResults.filter((er: any) => er.status === 'graded')
    const totalCourses = courses.length
    const totalExams = courses.reduce((sum, c) => sum + c.exams.length, 0)
    const completedExams = allExamResults.length

    const overallAverageScore = allGradedExams.length > 0
      ? allGradedExams.reduce((sum: number, er: any) => sum + (er.percentage || 0), 0) / allGradedExams.length
      : 0

    const overallExamsPercentage = totalExams > 0
      ? (completedExams / totalExams) * 100
      : 0

    // Calcular porcentaje promedio de cursos completados
    const coursesWithProgress = courseStats.filter(cs => cs.topicsPercentage > 0 || cs.examsPercentage > 0)
    const averageCourseCompletion = courseStats.length > 0
      ? courseStats.reduce((sum, cs) => sum + (cs.topicsPercentage + cs.examsPercentage) / 2, 0) / courseStats.length
      : 0

    res.json({
      overall: {
        totalCourses,
        totalExams,
        completedExams,
        examsPercentage: Math.round(overallExamsPercentage),
        averageScore: Math.round(overallAverageScore),
        averageCourseCompletion: Math.round(averageCourseCompletion)
      },
      byCourse: courseStats
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message })
  }
}

