import mongoose, { Schema, Document } from 'mongoose'

export interface IFeature extends Document {
  name: string
  enabled: boolean
  description?: string
  config?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

const FeatureSchema = new Schema<IFeature>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    enabled: {
      type: Boolean,
      default: true
    },
    description: {
      type: String
    },
    config: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
)

export default mongoose.model<IFeature>('Feature', FeatureSchema)

