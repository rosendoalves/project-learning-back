import mongoose, { Schema, Document } from 'mongoose'

export interface IAIRecommendation extends Document {
  cacheKey: string
  studentId: mongoose.Types.ObjectId
  courseId: mongoose.Types.ObjectId
  recommendations: {
    nextTopics: Array<{
      topicId: mongoose.Types.ObjectId
      priority: number
      reason: string
    }>
    suggestedExercises: Array<{
      exerciseId: string
      type: string
      difficulty: string
    }>
    studyPlan: Array<{
      topic: string
      estimatedTime: number
      order: number
    }>
    areasToFocus: string[]
  }
  metadata: {
    studentProfile: {
      progress: number
      strengths: string[]
      weaknesses: string[]
      learningStyle?: string
    }
    generatedAt: Date
    lastUsed: Date
    tokensUsed?: number
    modelUsed?: string
  }
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

const AIRecommendationSchema = new Schema<IAIRecommendation>(
  {
    cacheKey: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    recommendations: {
      nextTopics: [{
        topicId: {
          type: Schema.Types.ObjectId,
          ref: 'Topic'
        },
        priority: {
          type: Number,
          min: 1,
          max: 10
        },
        reason: String
      }],
      suggestedExercises: [{
        exerciseId: String,
        type: String,
        difficulty: String
      }],
      studyPlan: [{
        topic: String,
        estimatedTime: Number,
        order: Number
      }],
      areasToFocus: [String]
    },
    metadata: {
      studentProfile: {
        progress: Number,
        strengths: [String],
        weaknesses: [String],
        learningStyle: String
      },
      generatedAt: {
        type: Date,
        default: Date.now
      },
      lastUsed: {
        type: Date,
        default: Date.now
      },
      tokensUsed: Number,
      modelUsed: String
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

// Índices
AIRecommendationSchema.index({ studentId: 1, courseId: 1 })
AIRecommendationSchema.index({ expiresAt: 1 })

export default mongoose.model<IAIRecommendation>('AIRecommendation', AIRecommendationSchema)

