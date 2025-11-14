import mongoose, { Schema, Document } from 'mongoose'

export type ContentType = 'syllabus' | 'topic' | 'exercise' | 'explanation' | 'recommendation' | 'grading'
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'

export interface IAIGeneratedContent extends Document {
  cacheKey: string // Hash único para búsqueda rápida
  contentType: ContentType
  courseId: mongoose.Types.ObjectId
  topicId?: mongoose.Types.ObjectId
  content: {
    title: string
    body: string
    learningObjectives: string[]
    difficulty: DifficultyLevel
    metadata?: Record<string, any>
  }
  metadata: {
    studentLevel: string
    context: string
    generatedAt: Date
    usageCount: number
    tokensUsed?: number
    modelUsed?: string
  }
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

const AIGeneratedContentSchema = new Schema<IAIGeneratedContent>(
  {
    cacheKey: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    contentType: {
      type: String,
      enum: ['syllabus', 'topic', 'exercise', 'explanation', 'recommendation', 'grading'],
      required: true
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    topicId: {
      type: Schema.Types.ObjectId,
      ref: 'Topic'
    },
    content: {
      title: {
        type: String,
        required: true
      },
      body: {
        type: String,
        required: true
      },
      learningObjectives: [{
        type: String
      }],
      difficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'intermediate'
      },
      metadata: {
        type: Schema.Types.Mixed
      }
    },
    metadata: {
      studentLevel: {
        type: String,
        required: true
      },
      context: {
        type: String,
        required: true
      },
      generatedAt: {
        type: Date,
        default: Date.now
      },
      usageCount: {
        type: Number,
        default: 0
      },
      tokensUsed: {
        type: Number
      },
      modelUsed: {
        type: String
      }
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
)

// Índices para búsquedas rápidas
AIGeneratedContentSchema.index({ courseId: 1, contentType: 1 })
AIGeneratedContentSchema.index({ expiresAt: 1 })
AIGeneratedContentSchema.index({ 'metadata.studentLevel': 1, contentType: 1 })

export default mongoose.model<IAIGeneratedContent>('AIGeneratedContent', AIGeneratedContentSchema)

