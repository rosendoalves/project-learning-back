import mongoose, { Schema, Document } from 'mongoose'

export interface IExamResult extends Document {
  student: mongoose.Types.ObjectId
  exam: mongoose.Types.ObjectId
  answers: mongoose.Types.ObjectId[]
  totalScore: number
  maxScore: number
  percentage: number
  status: 'in-progress' | 'submitted' | 'graded'
  submittedAt?: Date
  gradedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const ExamResultSchema = new Schema<IExamResult>(
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
    answers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Answer'
      }
    ],
    totalScore: {
      type: Number,
      default: 0,
      min: 0
    },
    maxScore: {
      type: Number,
      required: true
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    status: {
      type: String,
      enum: ['in-progress', 'submitted', 'graded'],
      default: 'in-progress'
    },
    submittedAt: {
      type: Date
    },
    gradedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
)

// Índice único para evitar duplicados
ExamResultSchema.index({ student: 1, exam: 1 }, { unique: true })

export default mongoose.model<IExamResult>('ExamResult', ExamResultSchema)

