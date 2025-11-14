import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  username: string
  password: string
  email?: string
  fullName?: string
  role: 'student' | 'teacher' | 'admin'
  enrolledCourses: mongoose.Types.ObjectId[]
  currentMembership?: mongoose.Types.ObjectId
  hasActiveMembership: boolean
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    fullName: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      enum: ['student', 'teacher', 'admin'],
      default: 'student'
    },
    enrolledCourses: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Course'
      }
    ],
    currentMembership: {
      type: Schema.Types.ObjectId,
      ref: 'Membership'
    },
    hasActiveMembership: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
)

export default mongoose.model<IUser>('User', UserSchema)

