import mongoose, { Schema, Document } from 'mongoose'

export interface ITopicProgress extends Document {
  student: mongoose.Types.ObjectId
  topic: mongoose.Types.ObjectId
  course: mongoose.Types.ObjectId
  viewed: boolean
  viewedAt?: Date
  completed: boolean
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const TopicProgressSchema = new Schema<ITopicProgress>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    topic: {
      type: Schema.Types.ObjectId,
      ref: 'Topic',
      required: true
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    viewed: {
      type: Boolean,
      default: false
    },
    viewedAt: {
      type: Date
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
)

// Índice único para evitar duplicados
TopicProgressSchema.index({ student: 1, topic: 1 }, { unique: true })

export default mongoose.model<ITopicProgress>('TopicProgress', TopicProgressSchema)

