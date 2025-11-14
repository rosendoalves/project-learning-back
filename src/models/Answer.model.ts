import mongoose, { Schema, Document } from 'mongoose'

export interface IAnswer extends Document {
  student: mongoose.Types.ObjectId
  exam: mongoose.Types.ObjectId
  question: mongoose.Types.ObjectId
  answer: string | number // string para development, number (índice) para multiple-choice
  isCorrect?: boolean // Solo para multiple-choice
  score?: number // Puntos obtenidos
  feedback?: string // Feedback de IA para development
  suggestions?: string[] // Sugerencias de mejora de IA
  submittedAt: Date
  createdAt: Date
  updatedAt: Date
}

const AnswerSchema = new Schema<IAnswer>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    exam: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      required: true
    },
    question: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    answer: {
      type: Schema.Types.Mixed,
      required: true
    },
    isCorrect: {
      type: Boolean
    },
    score: {
      type: Number,
      min: 0
    },
    feedback: {
      type: String
    },
    suggestions: [{
      type: String
    }],
    submittedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
)

// Índice para búsquedas rápidas
AnswerSchema.index({ student: 1, exam: 1, question: 1 })

export default mongoose.model<IAnswer>('Answer', AnswerSchema)

