import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAccountDeletion extends Document {
  email: string;
  reasons: string[];
  deletedAt: Date;
  username?: string; // Store username if available for reference
}

const AccountDeletionSchema = new Schema<IAccountDeletion>(
  {
    email: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: false,
      index: true,
    },
    reasons: {
      type: [String],
      required: true,
    },
    deletedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: false, // We use deletedAt instead of createdAt
  }
);

// Create indexes
AccountDeletionSchema.index({ email: 1 });
AccountDeletionSchema.index({ deletedAt: -1 }); // For querying recent deletions

const AccountDeletion: Model<IAccountDeletion> =
  mongoose.models.AccountDeletion ||
  mongoose.model<IAccountDeletion>("AccountDeletion", AccountDeletionSchema);

export default AccountDeletion;

