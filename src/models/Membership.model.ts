import mongoose, { Schema, Document } from 'mongoose'

export type MembershipType = 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual'
export type MembershipStatus = 'active' | 'expired' | 'cancelled' | 'pending'

export interface IMembership extends Document {
  user: mongoose.Types.ObjectId
  type: MembershipType
  status: MembershipStatus
  startDate: Date
  endDate: Date
  price: number
  currency: string
  paymentId?: mongoose.Types.ObjectId
  autoRenew: boolean
  createdAt: Date
  updatedAt: Date
}

const MembershipSchema = new Schema<IMembership>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'semiannual', 'annual'],
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'pending'],
      default: 'pending'
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    endDate: {
      type: Date,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'ARS',
      required: true
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment'
    },
    autoRenew: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
)

// Índice para búsquedas rápidas
MembershipSchema.index({ user: 1, status: 1 })
MembershipSchema.index({ endDate: 1, status: 1 })

// Método para verificar si está activa
MembershipSchema.methods.isActive = function() {
  const now = new Date()
  return this.status === 'active' && this.endDate > now
}

export default mongoose.model<IMembership>('Membership', MembershipSchema)

