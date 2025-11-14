import mongoose, { Schema, Document } from 'mongoose'

export interface IQuestion extends Document {
  question: string
  type: 'multiple-choice' | 'development'
  options?: string[] // Solo para multiple-choice
  correctAnswer?: number // Índice de la opción correcta (solo para multiple-choice)
  points: number
  exam: mongoose.Types.ObjectId
  order: number
  createdAt: Date
  updatedAt: Date
}

const QuestionSchema = new Schema<IQuestion>(
  {
    question: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['multiple-choice', 'development'],
      required: true
    },
    options: [
      {
        type: String
      }
    ],
    correctAnswer: {
      type: Number
    },
    points: {
      type: Number,
      required: true,
      min: 0
    },
    exam: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      required: true
    },
    order: {
      type: Number,
      required: true,
      min: 1
    }
  },
  {
    timestamps: true
  }
)

// Validación: multiple-choice debe tener options y correctAnswer
QuestionSchema.pre('validate', function (next) {
  if (this.type === 'multiple-choice') {
    if (!this.options || this.options.length < 2) {
      return next(new Error('Multiple choice questions must have at least 2 options'))
    }
    if (this.correctAnswer === undefined || this.correctAnswer < 0 || this.correctAnswer >= this.options.length) {
      return next(new Error('Invalid correctAnswer for multiple choice question'))
    }
  }
  next()
})

export default mongoose.model<IQuestion>('Question', QuestionSchema)

