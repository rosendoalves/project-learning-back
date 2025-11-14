import mongoose, { Schema, Document } from 'mongoose'

export interface IExam extends Document {
  title: string
  description: string
  type: 'multiple-choice' | 'development'
  course: mongoose.Types.ObjectId
  questions: mongoose.Types.ObjectId[]
  totalPoints: number
  duration?: number // en minutos
  availableFrom?: Date
  availableUntil?: Date
  createdAt: Date
  updatedAt: Date
}

const ExamSchema = new Schema<IExam>(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['multiple-choice', 'development'],
      required: true
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    questions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Question'
      }
    ],
    totalPoints: {
      type: Number,
      default: 0
    },
    duration: {
      type: Number // minutos
    },
    availableFrom: {
      type: Date
    },
    availableUntil: {
      type: Date
    }
  },
  {
    timestamps: true
  }
)

export default mongoose.model<IExam>('Exam', ExamSchema)

