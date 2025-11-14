import { Response } from 'express'
import Exam from '../models/Exam.model'
import Question from '../models/Question.model'
import Answer from '../models/Answer.model'
import ExamResult from '../models/ExamResult.model'
import Course from '../models/Course.model'
import { AuthRequest } from '../middleware/auth.middleware'
import { gradeDevelopmentExam } from '../services/ai.service'

export const getExamById = async (req: AuthRequest, res: Response) => {
  try {
    const { examId } = req.params

    const exam = await Exam.findById(examId)
      .populate({
        path: 'questions',
        select: 'question type options points order',
        options: { sort: { order: 1 } }
      })
      .populate('course', 'name code')

    if (!exam) {
      return res.status(404).json({ message: 'Examen no encontrado' })
    }

    // Verificar que el estudiante esté inscrito en el curso
    const course = await Course.findById(exam.course)
    if (!course || !course.students.includes(req.userId!)) {
      return res.status(403).json({ message: 'No tienes acceso a este examen' })
    }

    // Para múltiple choice, no enviar la respuesta correcta
    const examData = exam.toObject()
    if (exam.type === 'multiple-choice') {
      examData.questions = examData.questions.map((q: any) => {
        const { correctAnswer, ...questionWithoutAnswer } = q
        return questionWithoutAnswer
      })
    }

    res.json(examData)
  } catch (error: any) {
    res.status(500).json({ message: 'Error al obtener examen', error: error.message })
  }
}

export const submitAnswer = async (req: AuthRequest, res: Response) => {
  try {
    const { examId, questionId, answer } = req.body

    if (!req.userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' })
    }

    if (!examId || !questionId || answer === undefined) {
      return res.status(400).json({ message: 'Faltan datos requeridos' })
    }

    const question = await Question.findById(questionId)
    if (!question) {
      return res.status(404).json({ message: 'Pregunta no encontrada' })
    }

    const exam = await Exam.findById(examId)
    if (!exam) {
      return res.status(404).json({ message: 'Examen no encontrado' })
    }

    // Verificar que la pregunta pertenece al examen
    const questionObjectId = typeof questionId === 'string' ? questionId : questionId.toString()
    const examQuestions = exam.questions.map((q: any) => q.toString())
    if (!examQuestions.includes(questionObjectId)) {
      return res.status(400).json({ message: 'La pregunta no pertenece a este examen' })
    }

    // Buscar o crear respuesta
    let answerDoc = await Answer.findOne({
      student: req.userId,
      exam: examId,
      question: questionId
    })

    let isCorrect = false
    let score = 0

    // Para multiple-choice, verificar respuesta
    if (question.type === 'multiple-choice') {
      isCorrect = question.correctAnswer === answer
      score = isCorrect ? question.points : 0

      if (answerDoc) {
        answerDoc.answer = answer
        answerDoc.isCorrect = isCorrect
        answerDoc.score = score
      } else {
        answerDoc = new Answer({
          student: req.userId,
          exam: examId,
          question: questionId,
          answer,
          isCorrect,
          score
        })
      }
    } else {
      // Para development, solo guardar la respuesta (la IA la corregirá después)
      if (answerDoc) {
        answerDoc.answer = answer
      } else {
        answerDoc = new Answer({
          student: req.userId,
          exam: examId,
          question: questionId,
          answer
        })
      }
    }

    await answerDoc.save()

    res.json({
      message: 'Respuesta guardada',
      answer: answerDoc,
      isCorrect: question.type === 'multiple-choice' ? isCorrect : undefined
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al guardar respuesta', error: error.message })
  }
}

export const submitExam = async (req: AuthRequest, res: Response) => {
  try {
    const { examId } = req.params
    const { answers: answersFromBody } = req.body // Respuestas enviadas desde el frontend

    const exam = await Exam.findById(examId)
      .populate('questions')
      .populate('course', 'name description')
    if (!exam) {
      return res.status(404).json({ message: 'Examen no encontrado' })
    }

    // Si se enviaron respuestas en el body, guardarlas primero
    if (answersFromBody && typeof answersFromBody === 'object') {
      for (const [questionId, answerValue] of Object.entries(answersFromBody)) {
        const question = exam.questions.find((q: any) => q._id.toString() === questionId)
        if (!question) continue

        let answerDoc = await Answer.findOne({
          student: req.userId,
          exam: examId,
          question: questionId
        })

        if (question.type === 'multiple-choice') {
          const isCorrect = question.correctAnswer === answerValue
          const score = isCorrect ? question.points : 0

          if (answerDoc) {
            answerDoc.answer = answerValue
            answerDoc.isCorrect = isCorrect
            answerDoc.score = score
          } else {
            answerDoc = new Answer({
              student: req.userId,
              exam: examId,
              question: questionId,
              answer: answerValue,
              isCorrect,
              score
            })
          }
        } else {
          if (answerDoc) {
            answerDoc.answer = answerValue
          } else {
            answerDoc = new Answer({
              student: req.userId,
              exam: examId,
              question: questionId,
              answer: answerValue
            })
          }
        }
        await answerDoc.save()
      }
    }

    // Obtener todas las respuestas del estudiante (ahora actualizadas)
    const answers = await Answer.find({
      student: req.userId,
      exam: examId
    })

    // Buscar o crear resultado del examen
    // Permitir reintentar: si ya existe, actualizarlo en lugar de crear uno nuevo
    let examResult = await ExamResult.findOne({
      student: req.userId,
      exam: examId
    })

    if (!examResult) {
      examResult = new ExamResult({
        student: req.userId,
        exam: examId,
        answers: answers.map(a => a._id),
        maxScore: exam.totalPoints,
        status: exam.type === 'multiple-choice' ? 'graded' : 'submitted'
      })
    } else {
      // Permitir reintentar: actualizar respuestas y resetear estado
      examResult.answers = answers.map(a => a._id)
      examResult.status = exam.type === 'multiple-choice' ? 'graded' : 'submitted'
      examResult.totalScore = 0
      examResult.percentage = 0
    }

    // Calcular puntuación para multiple-choice
    if (exam.type === 'multiple-choice') {
      const totalScore = answers.reduce((sum, answer) => {
        return sum + (answer.score || 0)
      }, 0)

      examResult.totalScore = totalScore
      examResult.percentage = (totalScore / exam.totalPoints) * 100
      examResult.gradedAt = new Date()
    } else if (exam.type === 'development') {
      // Corregir examen de desarrollo con IA automáticamente
      let totalScore = 0

      for (const answerDoc of answers) {
        const question = exam.questions.find(
          (q: any) => q._id.toString() === answerDoc.question.toString()
        )

        if (question && answerDoc.answer) {
          // Verificar si la respuesta ya tiene corrección guardada
          // Cargar el documento original desde la BD para comparar
          const originalAnswer = await Answer.findById(answerDoc._id)
          const currentAnswerText = String(answerDoc.answer).trim()
          const originalAnswerText = originalAnswer ? String(originalAnswer.answer).trim() : ''
          
          // Si la respuesta ya tiene corrección y no cambió, reutilizar
          if (originalAnswer && originalAnswer.score !== undefined && originalAnswer.feedback && 
              originalAnswerText === currentAnswerText) {
            console.log(`✅ Reutilizando corrección existente para pregunta ${question._id} (respuesta no cambió)`)
            totalScore += originalAnswer.score || 0
            // Asegurar que el answerDoc tenga los valores correctos
            answerDoc.score = originalAnswer.score
            answerDoc.feedback = originalAnswer.feedback
            answerDoc.suggestions = originalAnswer.suggestions
            answerDoc.isCorrect = originalAnswer.isCorrect
            continue
          }

          try {
            // Obtener información del curso para contexto
            const courseInfo = {
              name: exam.course.name || 'Curso',
              description: exam.course.description || ''
            }
            
            // Obtener el courseId real (ObjectId)
            const courseId = typeof exam.course === 'object' && exam.course._id 
              ? exam.course._id.toString() 
              : typeof exam.course === 'string' 
                ? exam.course 
                : undefined
            
            // Corregir con IA (incluyendo contexto del curso)
            // El servicio de IA ya maneja el cache internamente basado en pregunta + respuesta
            console.log(`🔄 Corrigiendo pregunta ${question._id} con IA (respuesta ${originalAnswerText !== currentAnswerText ? 'cambió' : 'nueva'})`)
            const gradingResult = await gradeDevelopmentExam(
              question.question,
              answerDoc.answer as string,
              `Puntos máximos: ${question.points}. Evalúa: comprensión del tema, claridad, uso correcto de conceptos, completitud.`,
              courseInfo,
              courseId
            )

            // Calcular score basado en porcentaje de la IA
            const score = Math.round((gradingResult.score / 100) * question.points)
            totalScore += score

            // Actualizar respuesta con corrección
            answerDoc.score = score
            answerDoc.feedback = gradingResult.feedback
            answerDoc.suggestions = gradingResult.suggestions
            answerDoc.isCorrect = gradingResult.score >= 60 // Considerar correcto si >= 60%
            await answerDoc.save()
          } catch (error: any) {
            console.error(`Error corrigiendo pregunta ${question._id}:`, error)
            // El servicio de IA ahora siempre retorna un fallback útil
            // Si llegamos aquí, es un error inesperado, usar fallback básico
            const fallbackScore = Math.max(30, Math.min(70, Math.floor((answerDoc.answer as string).length / 5)))
            answerDoc.score = fallbackScore
            answerDoc.feedback = `Tu respuesta ha sido revisada. Se detectó un problema técnico durante la corrección automática, pero tu respuesta ha sido considerada. Por favor, revisa los temas relacionados con la pregunta para mejorar tu comprensión.`
            answerDoc.suggestions = [
              'Revisa los conceptos clave de la pregunta',
              'Intenta explicar tu razonamiento con más detalle',
              'Consulta el material de estudio relacionado'
            ]
            answerDoc.isCorrect = fallbackScore >= 60
            await answerDoc.save()
            totalScore += fallbackScore
          }
        }
      }

      examResult.totalScore = totalScore
      examResult.percentage = (totalScore / exam.totalPoints) * 100
      examResult.status = 'graded'
      examResult.gradedAt = new Date()
    }

    examResult.submittedAt = new Date()
    await examResult.save()

    // Poblar respuestas con feedback para el frontend
    await examResult.populate({
      path: 'answers',
      populate: {
        path: 'question',
        select: 'question type points'
      }
    })

    res.json({
      message: 'Examen enviado exitosamente',
      result: examResult,
      needsAIGrading: false // Ya está corregido
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al enviar examen', error: error.message })
  }
}

export const getExamResult = async (req: AuthRequest, res: Response) => {
  try {
    const { examId } = req.params

    const examResult = await ExamResult.findOne({
      student: req.userId,
      exam: examId
    })
      .populate({
        path: 'answers',
        populate: {
          path: 'question',
          select: 'question type points'
        }
      })
      .populate('exam', 'title type totalPoints')

    if (!examResult) {
      return res.status(404).json({ message: 'Resultado no encontrado' })
    }

    res.json(examResult)
  } catch (error: any) {
    res.status(500).json({ message: 'Error al obtener resultado', error: error.message })
  }
}

