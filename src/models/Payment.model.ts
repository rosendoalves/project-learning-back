import mongoose, { Schema, Document } from 'mongoose'

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type PaymentMethod = 'credit_card' | 'debit_card' | 'bank_transfer' | 'mercadopago' | 'other'

export interface IPayment extends Document {
  user: mongoose.Types.ObjectId
  membership: mongoose.Types.ObjectId
  amount: number
  currency: string
  status: PaymentStatus
  paymentMethod: PaymentMethod
  transactionId?: string
  externalPaymentId?: string // ID de pasarela de pagos (MercadoPago, etc.)
  paymentDate?: Date
  failureReason?: string
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

const PaymentSchema = new Schema<IPayment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    membership: {
      type: Schema.Types.ObjectId,
      ref: 'Membership',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'ARS',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'debit_card', 'bank_transfer', 'mercadopago', 'other'],
      required: true
    },
    transactionId: {
      type: String,
      sparse: true
    },
    externalPaymentId: {
      type: String
    },
    paymentDate: {
      type: Date
    },
    failureReason: {
      type: String
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
)

// Índices
PaymentSchema.index({ user: 1, status: 1 })
PaymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true })
PaymentSchema.index({ externalPaymentId: 1 })

export default mongoose.model<IPayment>('Payment', PaymentSchema)

