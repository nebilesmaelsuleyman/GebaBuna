import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'farmer' | 'buyer' | 'admin';
export type PreferredLanguage = 'om' | 'am' | 'en';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  role: UserRole;
  email?: string;
  phone?: string;
  passwordHash: string;
  fullName: string;
  preferredLanguage: PreferredLanguage;
  avatar?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    role: {
      type: String,
      enum: ['farmer', 'buyer', 'admin'],
      required: true,
      default: 'farmer',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    preferredLanguage: {
      type: String,
      enum: ['om', 'am', 'en'],
      default: 'om',
    },
    avatar: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure at least one identifier (email or phone) exists
UserSchema.pre('validate', function (next) {
  if (!this.email && !this.phone) {
    next(new Error('User must have either an email or a phone number.'));
  } else {
    next();
  }
});

export const User = mongoose.model<IUser>('User', UserSchema);
