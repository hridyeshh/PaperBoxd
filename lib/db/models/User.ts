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
  isbndbId?: string; // ISBNdb ID
  openLibraryId?: string; // Open Library ID
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
  collaborators?: mongoose.Types.ObjectId[]; // References to User collection
  allowedUsers?: string[]; // Usernames who have access to this private list
  createdAt: Date;
  updatedAt: Date;
  _id?: mongoose.Types.ObjectId;
}

export interface IDiaryEntry {
  bookId?: mongoose.Types.ObjectId | null; // Optional for general diary entries
  bookTitle?: string | null; // Optional for general diary entries
  bookAuthor?: string | null; // Optional for general diary entries
  bookCover?: string | null;
  subject?: string | null; // Subject/title for general diary entries
  content: string; // Rich text content (HTML)
  likes?: mongoose.Types.ObjectId[]; // Array of user IDs who liked this entry
  createdAt: Date;
  updatedAt: Date;
}

export interface IActivity {
  type: "read" | "rated" | "liked" | "added_to_list" | "started_reading" | "reviewed" | "shared_list" | "shared_book" | "collaboration_request" | "granted_access";
  bookId?: mongoose.Types.ObjectId;
  listId?: string;
  listTitle?: string; // Title of the list for granted_access activities
  rating?: number;
  review?: string;
  timestamp: Date;
  sharedBy?: mongoose.Types.ObjectId; // User who shared the list/book
  sharedByUsername?: string; // Username of the person who shared/granted access
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
  username?: string; // Optional - user must set it after sign-up
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

  // Diary Entries
  diaryEntries: IDiaryEntry[];

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

  // Password Reset
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
}

// =====================================================
// Mongoose Schemas
// =====================================================

const BookReferenceSchema = new Schema({
  bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
  isbndbId: { type: String },
  openLibraryId: { type: String },
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
  collaborators: [{ type: Schema.Types.ObjectId, ref: "User" }],
  allowedUsers: [{ type: String }], // Usernames who have access to this private list
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const DiaryEntrySchema = new Schema({
  bookId: { 
    type: Schema.Types.ObjectId, 
    ref: "Book", 
    required: false,
    default: undefined // Explicitly allow undefined
  }, // Optional for general diary entries
  bookTitle: { 
    type: String, 
    required: false,
    default: undefined // Explicitly allow undefined
  }, // Optional for general diary entries
  bookAuthor: { 
    type: String, 
    required: false,
    default: undefined // Explicitly allow undefined
  }, // Optional for general diary entries
  bookCover: { 
    type: String,
    required: false,
    default: undefined
  },
  subject: {
    type: String,
    required: false,
  }, // Subject/title for general diary entries
  content: { type: String, required: true }, // HTML content
  likes: [{ type: Schema.Types.ObjectId, ref: "User" }], // Array of user IDs who liked this entry
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, {
  _id: true, // Ensure _id is generated for each entry
  strict: true, // Only save fields defined in schema
});

const ActivitySchema = new Schema({
  type: {
    type: String,
    enum: ["read", "rated", "liked", "added_to_list", "started_reading", "reviewed", "shared_list", "shared_book", "collaboration_request", "granted_access"],
    required: true,
  },
  bookId: { type: Schema.Types.ObjectId, ref: "Book" },
  listId: { type: String },
  listTitle: { type: String }, // Title of the list for granted_access activities
  rating: { type: Number, min: 1, max: 5 },
  review: { type: String },
  timestamp: { type: Date, default: Date.now },
  sharedBy: { type: Schema.Types.ObjectId, ref: "User" },
  sharedByUsername: { type: String },
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
      required: false, // Optional - user sets it after sign-up
      unique: true,
      sparse: true, // Allow multiple nulls
      trim: true,
      validate: {
        validator: function(v: string | undefined) {
          // Only validate if value is provided
          if (!v) return true; // Allow undefined/null
          return v.length >= 3 && v.length <= 30;
        },
        message: "Username must be between 3 and 30 characters",
      },
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

    // Diary Entries
    diaryEntries: [DiaryEntrySchema],

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

    // Password Reset
    resetPasswordToken: { type: String, required: false },
    resetPasswordExpires: { type: Date, required: false },
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
