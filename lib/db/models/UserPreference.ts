import mongoose, { Schema, Document, Model } from "mongoose";

// =====================================================
// Type Definitions
// =====================================================

interface IGenreEntry {
  genre: string;
  weight?: number;
}

interface IOnboarding {
  genres?: IGenreEntry[];
  favoriteAuthors?: string[];
  completedAt?: Date;
}

interface IImplicitPreferences {
  genreWeights?: Map<string, number>;
  authorWeights?: Map<string, number>;
  updatedAt?: Date;
}

export interface IUserPreference extends Document {
  userId: mongoose.Types.ObjectId;
  onboarding?: IOnboarding;
  implicitPreferences?: IImplicitPreferences;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// Schema
// =====================================================

const GenreEntrySchema = new Schema<IGenreEntry>(
  {
    genre: { type: String, required: true },
    weight: { type: Number, default: 1 },
  },
  { _id: false }
);

const OnboardingSchema = new Schema<IOnboarding>(
  {
    genres: [GenreEntrySchema],
    favoriteAuthors: [{ type: String }],
    completedAt: { type: Date },
  },
  { _id: false }
);

const ImplicitPreferencesSchema = new Schema<IImplicitPreferences>(
  {
    genreWeights: { type: Map, of: Number },
    authorWeights: { type: Map, of: Number },
    updatedAt: { type: Date },
  },
  { _id: false }
);

const UserPreferenceSchema = new Schema<IUserPreference>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    onboarding: { type: OnboardingSchema },
    implicitPreferences: { type: ImplicitPreferencesSchema },
  },
  {
    timestamps: true,
  }
);

// =====================================================
// Model Export
// =====================================================

const UserPreference: Model<IUserPreference> =
  (mongoose.models && mongoose.models.UserPreference as Model<IUserPreference>) ||
  mongoose.model<IUserPreference>("UserPreference", UserPreferenceSchema);

export default UserPreference;
