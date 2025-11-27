import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOTP extends Document {
  userId: mongoose.Types.ObjectId;
  code: string; // Hashed 6-digit code
  expiresAt: Date; // 10 minutes
  attempts: number; // Max 5 attempts
  used: boolean;
  type: "login" | "password_reset";
  createdAt: Date;
}

const OTPSchema = new Schema<IOTP>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // TTL index for auto-cleanup
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5,
    },
    used: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: ["login", "password_reset"],
      required: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt
  }
);

// Compound indexes for fast lookups
OTPSchema.index({ userId: 1, type: 1, used: 1 });
OTPSchema.index({ userId: 1, type: 1, expiresAt: 1 });

// Unique index: one active (unused, not expired) OTP per user per type
OTPSchema.index(
  { userId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { used: false, expiresAt: { $gt: new Date() } },
  }
);

const OTP: Model<IOTP> =
  (mongoose.models && mongoose.models.OTP) || mongoose.model<IOTP>("OTP", OTPSchema);

export default OTP;

