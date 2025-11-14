import mongoose, { Schema, Document } from 'mongoose'

export interface ICourse extends Document {
  name: string
  description: string
  teacher: string
  year: string
  code: string
  topics: mongoose.Types.ObjectId[]
  exams: mongoose.Types.ObjectId[]
  students: mongoose.Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const CourseSchema = new Schema<ICourse>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    teacher: {
      type: String,
      required: true
    },
    year: {
      type: String,
      required: true
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    topics: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Topic'
      }
    ],
    exams: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Exam'
      }
    ],
    students: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    timestamps: true
  }
)

export default mongoose.model<ICourse>('Course', CourseSchema)

