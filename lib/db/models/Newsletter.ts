import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Newsletter Model
 *
 * Stores newsletter subscription emails from the footer "Stay Connected" form.
 */

// ============================================
// INTERFACES & TYPES
// ============================================

export interface INewsletter extends Document {
  email: string;
  subscribedAt: Date;
  isActive: boolean;
  unsubscribedAt?: Date;
  source?: string; // e.g., "footer", "onboarding", etc.
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// MONGOOSE SCHEMA
// ============================================

const NewsletterSchema = new Schema<INewsletter>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
      index: true,
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    unsubscribedAt: {
      type: Date,
    },
    source: {
      type: String,
      default: 'footer',
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// ============================================
// INDEXES
// ============================================

// Email index is automatically created via unique: true
// isActive index is created for filtering active subscriptions

// ============================================
// MODEL EXPORT
// ============================================

const Newsletter: Model<INewsletter> =
  (mongoose.models && mongoose.models.Newsletter) ||
  mongoose.model<INewsletter>('Newsletter', NewsletterSchema);

export default Newsletter;

