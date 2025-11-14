import mongoose, { Schema, Document, Model } from "mongoose";

// Polyfill for process.emitWarning in edge runtime contexts
if (typeof process !== "undefined" && typeof process.emitWarning !== "function") {
  process.emitWarning = function (message: string, type?: string) {
    // No-op in edge runtime, or could use console.warn if needed
    if (typeof console !== "undefined" && console.warn) {
      console.warn(`[${type || "Warning"}] ${message}`);
    }
  } as typeof process.emitWarning;
}

// =====================================================
// Type Definitions
// =====================================================

export interface IBookReference {
  bookId: mongoose.Types.ObjectId; // Reference to Book collection
  googleBooksId?: string; // Google Books API ID
  title: string;
  author: string;
  cover: string;
  mood?: string;
}

export interface IBookshelfBook extends IBookReference {
  finishedOn: Date;
  format?: "Print" | "Digital" | "Audio";
  rating?: number; // 1-5
  thoughts?: string;
}

export interface ILikedBook extends IBookReference {
  likedOn: Date;
  reason?: string;
}

export interface ITbrBook extends IBookReference {
  addedOn: Date;
  urgency?: "Soon" | "Eventually" | "This weekend";
  whyNow?: string;
}

export interface IReadingList {
  title: string;
  description?: string;
  books: mongoose.Types.ObjectId[]; // References to Book collection
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  _id?: mongoose.Types.ObjectId;
}

export interface IActivity {
  type: "read" | "rated" | "liked" | "added_to_list" | "started_reading" | "reviewed";
  bookId?: mongoose.Types.ObjectId;
  listId?: string;
  rating?: number;
  review?: string;
  timestamp: Date;
}

export interface IAuthorStats {
  authorName: string;
  booksRead: number;
  booksTbr: number;
  favoriteBook?: mongoose.Types.ObjectId;
}

export interface IUser extends Document {
  // Authentication & Basic Profile
  email: string;
  password: string; // Hashed
  username: string;
  name: string;

  // Profile Information
  avatar?: string;
  bio?: string;
  birthday?: Date;
  gender?: string;
  pronouns: string[];
  links?: string[];
  isPublic: boolean;

  // Social
  followers: mongoose.Types.ObjectId[]; // User IDs
  following: mongoose.Types.ObjectId[]; // User IDs

  // Books & Reading
  topBooks: IBookReference[]; // 4-6 favorite books
  favoriteBooks: IBookReference[]; // Up to 12 favorite books
  bookshelf: IBookshelfBook[]; // All finished books
  likedBooks: ILikedBook[]; // Starred/saved books
  tbrBooks: ITbrBook[]; // To be read
  currentlyReading: IBookReference[];

  // Reading Lists
  readingLists: IReadingList[];

  // Activity & Engagement
  activities: IActivity[];

  // Author Tracking
  authorsRead: IAuthorStats[];

  // Statistics
  totalBooksRead: number;
  totalPagesRead: number;
  readingGoal?: {
    year: number;
    target: number;
    current: number;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastActive: Date;
}

// =====================================================
// Mongoose Schemas
// =====================================================

const BookReferenceSchema = new Schema({
  bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
  googleBooksId: { type: String },
  title: { type: String, required: true },
  author: { type: String, required: true },
  cover: { type: String, required: true },
  mood: { type: String },
});

const BookshelfBookSchema = new Schema({
  ...BookReferenceSchema.obj,
  finishedOn: { type: Date, required: true },
  format: { type: String, enum: ["Print", "Digital", "Audio"] },
  rating: { type: Number, min: 1, max: 5 },
  thoughts: { type: String },
});

const LikedBookSchema = new Schema({
  ...BookReferenceSchema.obj,
  likedOn: { type: Date, default: Date.now },
  reason: { type: String },
});

const TbrBookSchema = new Schema({
  ...BookReferenceSchema.obj,
  addedOn: { type: Date, default: Date.now },
  urgency: { type: String, enum: ["Soon", "Eventually", "This weekend"] },
  whyNow: { type: String },
});

const ReadingListSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  books: [{ type: Schema.Types.ObjectId, ref: "Book" }],
  isPublic: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const ActivitySchema = new Schema({
  type: {
    type: String,
    enum: ["read", "rated", "liked", "added_to_list", "started_reading", "reviewed"],
    required: true,
  },
  bookId: { type: Schema.Types.ObjectId, ref: "Book" },
  listId: { type: String },
  rating: { type: Number, min: 1, max: 5 },
  review: { type: String },
  timestamp: { type: Date, default: Date.now },
});

const AuthorStatsSchema = new Schema({
  authorName: { type: String, required: true },
  booksRead: { type: Number, default: 0 },
  booksTbr: { type: Number, default: 0 },
  favoriteBook: { type: Schema.Types.ObjectId, ref: "Book" },
});

const UserSchema = new Schema<IUser>(
  {
    // Authentication & Basic Profile
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: { type: String, required: true },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    name: { type: String, required: true, trim: true },

    // Profile Information
    avatar: { type: String },
    bio: { type: String, maxlength: 500 },
    birthday: { type: Date },
    gender: { type: String },
    pronouns: [{ type: String }],
    links: [{ type: String }],
    isPublic: { type: Boolean, default: true },

    // Social
    followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: Schema.Types.ObjectId, ref: "User" }],

    // Books & Reading
    topBooks: [BookReferenceSchema],
    favoriteBooks: [BookReferenceSchema],
    bookshelf: [BookshelfBookSchema],
    likedBooks: [LikedBookSchema],
    tbrBooks: [TbrBookSchema],
    currentlyReading: [BookReferenceSchema],

    // Reading Lists
    readingLists: [ReadingListSchema],

    // Activity & Engagement
    activities: [ActivitySchema],

    // Author Tracking
    authorsRead: [AuthorStatsSchema],

    // Statistics
    totalBooksRead: { type: Number, default: 0 },
    totalPagesRead: { type: Number, default: 0 },
    readingGoal: {
      year: { type: Number },
      target: { type: Number },
      current: { type: Number, default: 0 },
    },

    // Metadata
    lastActive: { type: Date, default: Date.now },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// =====================================================
// Indexes for Performance
// =====================================================

// Note: email and username indexes are automatically created via unique: true
// Additional indexes can be created manually in MongoDB Atlas or via migrations if needed

// =====================================================
// Model Export (with proper TypeScript typing)
// =====================================================

const User: Model<IUser> =
  (mongoose.models && mongoose.models.User) || mongoose.model<IUser>("User", UserSchema);

export default User;
