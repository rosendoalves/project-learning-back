import mongoose, { Schema, Document } from 'mongoose'

export interface ITopic extends Document {
  title: string
  content: string
  order: number
  course: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const TopicSchema = new Schema<ITopic>(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true
    },
    order: {
      type: Number,
      required: true,
      min: 1
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    }
  },
  {
    timestamps: true
  }
)

// Índice para ordenar por curso y orden
TopicSchema.index({ course: 1, order: 1 })

export default mongoose.model<ITopic>('Topic', TopicSchema)

