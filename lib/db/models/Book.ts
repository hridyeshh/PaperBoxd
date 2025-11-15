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

export interface IIndustryIdentifier {
  type: string; // "ISBN_10", "ISBN_13", etc.
  identifier: string;
}

export interface IImageLinks {
  smallThumbnail?: string;
  thumbnail?: string;
  small?: string;
  medium?: string;
  large?: string;
  extraLarge?: string;
}

export interface IVolumeInfo {
  title: string;
  subtitle?: string;
  authors: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  industryIdentifiers?: IIndustryIdentifier[];
  pageCount?: number;
  categories?: string[];
  averageRating?: number;
  ratingsCount?: number;
  language?: string;
  imageLinks?: IImageLinks;
  previewLink?: string;
  infoLink?: string;
  canonicalVolumeLink?: string;
}

export interface ISaleInfo {
  country?: string;
  saleability?: string;
  isEbook?: boolean;
  listPrice?: {
    amount: number;
    currencyCode: string;
  };
  retailPrice?: {
    amount: number;
    currencyCode: string;
  };
  buyLink?: string;
}

export interface IBook extends Document {
  // Google Books ID (primary identifier for Google Books)
  googleBooksId?: string;

  // Open Library ID (primary identifier for Open Library)
  openLibraryId?: string;
  openLibraryKey?: string; // e.g., "/works/OL45804W"

  // Volume Information (normalized from either API)
  volumeInfo: IVolumeInfo;

  // Sale Information (Google Books only)
  saleInfo?: ISaleInfo;

  // Caching Metadata
  cachedAt: Date;
  lastUpdated: Date;
  apiSource: "google_books" | "open_library";

  // Usage Statistics (track how often this book is referenced)
  usageCount: number;
  lastAccessed: Date;

  // Paperboxd-specific data
  paperboxdRating?: number; // Average rating from all users
  paperboxdRatingsCount?: number; // Total ratings from users
  totalReads?: number; // How many users have read this book
  totalLikes?: number; // How many users liked this book
  totalTBR?: number; // How many users have this in TBR

  // Metadata
  createdAt: Date;
  updatedAt: Date;

  // Instance Methods
  recordAccess(): Promise<this>;
  isCacheStale(): boolean;
  updateStats(type: "read" | "like" | "tbr" | "rating", value?: number): Promise<this>;
}

// Model interface with static methods
export interface IBookModel extends Model<IBook> {
  findOrCreateFromGoogleBooks(googleBooksData: any): Promise<IBook>;
  findOrCreateFromOpenLibrary(openLibraryData: any): Promise<IBook>;
}

// =====================================================
// Mongoose Schema
// =====================================================

const IndustryIdentifierSchema = new Schema({
  type: { type: String, required: true },
  identifier: { type: String, required: true },
});

const ImageLinksSchema = new Schema({
  smallThumbnail: { type: String },
  thumbnail: { type: String },
  small: { type: String },
  medium: { type: String },
  large: { type: String },
  extraLarge: { type: String },
});

const VolumeInfoSchema = new Schema({
  title: { type: String, required: true },
  subtitle: { type: String },
  authors: [{ type: String, required: true }],
  publisher: { type: String },
  publishedDate: { type: String },
  description: { type: String },
  industryIdentifiers: [IndustryIdentifierSchema],
  pageCount: { type: Number },
  categories: [{ type: String }],
  averageRating: { type: Number },
  ratingsCount: { type: Number },
  language: { type: String, default: "en" },
  imageLinks: ImageLinksSchema,
  previewLink: { type: String },
  infoLink: { type: String },
  canonicalVolumeLink: { type: String },
});

const SaleInfoSchema = new Schema({
  country: { type: String },
  saleability: { type: String },
  isEbook: { type: Boolean },
  listPrice: {
    amount: { type: Number },
    currencyCode: { type: String },
  },
  retailPrice: {
    amount: { type: Number },
    currencyCode: { type: String },
  },
  buyLink: { type: String },
});

const BookSchema = new Schema<IBook>(
  {
    // Google Books ID (unique identifier for Google Books)
    googleBooksId: {
      type: String,
      sparse: true, // Allow null/undefined while maintaining uniqueness
      unique: true,
      index: true,
    },

    // Open Library ID (unique identifier for Open Library)
    openLibraryId: {
      type: String,
      sparse: true, // Allow null/undefined while maintaining uniqueness
      unique: true,
      index: true,
    },
    openLibraryKey: { type: String }, // e.g., "/works/OL45804W"

    // Volume Information
    volumeInfo: {
      type: VolumeInfoSchema,
      required: true,
    },

    // Sale Information (Google Books only)
    saleInfo: SaleInfoSchema,

    // Caching Metadata
    cachedAt: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
    apiSource: { type: String, enum: ["google_books", "open_library"], required: true },

    // Usage Statistics
    usageCount: { type: Number, default: 0 },
    lastAccessed: { type: Date, default: Date.now },

    // Paperboxd-specific data
    paperboxdRating: { type: Number, min: 0, max: 5 },
    paperboxdRatingsCount: { type: Number, default: 0 },
    totalReads: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    totalTBR: { type: Number, default: 0 },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// =====================================================
// Indexes for Performance
// =====================================================

// Note: googleBooksId index is automatically created via unique: true
// Text search and other indexes can be created manually in MongoDB Atlas if needed
// For text search: db.books.createIndex({ "volumeInfo.title": "text", "volumeInfo.authors": "text" })

// =====================================================
// Methods
// =====================================================

// Update usage statistics when book is accessed
BookSchema.methods.recordAccess = function () {
  this.usageCount += 1;
  this.lastAccessed = new Date();
  return this.save();
};

// Check if cache is stale (older than 30 days)
BookSchema.methods.isCacheStale = function (): boolean {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return this.cachedAt < thirtyDaysAgo;
};

// Update Paperboxd statistics
BookSchema.methods.updateStats = async function (
  type: "read" | "like" | "tbr" | "rating",
  value?: number
) {
  switch (type) {
    case "read":
      this.totalReads = (this.totalReads || 0) + 1;
      break;
    case "like":
      this.totalLikes = (this.totalLikes || 0) + 1;
      break;
    case "tbr":
      this.totalTBR = (this.totalTBR || 0) + 1;
      break;
    case "rating":
      if (value !== undefined) {
        const currentTotal =
          (this.paperboxdRating || 0) * (this.paperboxdRatingsCount || 0);
        this.paperboxdRatingsCount = (this.paperboxdRatingsCount || 0) + 1;
        this.paperboxdRating =
          (currentTotal + value) / this.paperboxdRatingsCount;
      }
      break;
  }
  return this.save();
};

// =====================================================
// Static Methods
// =====================================================

// Find or create book from Google Books data
BookSchema.statics.findOrCreateFromGoogleBooks = async function (
  googleBooksData: any
) {
  const googleBooksId = googleBooksData.id;

  let book = await this.findOne({ googleBooksId });

  if (book) {
    // Update last accessed and usage count
    book.usageCount += 1;
    book.lastAccessed = new Date();

    // Update cache if stale
    if (book.isCacheStale()) {
      book.volumeInfo = googleBooksData.volumeInfo;
      book.saleInfo = googleBooksData.saleInfo;
      book.lastUpdated = new Date();
    }

    await book.save();
  } else {
    // Create new book entry
    book = await this.create({
      googleBooksId,
      volumeInfo: googleBooksData.volumeInfo,
      saleInfo: googleBooksData.saleInfo,
      cachedAt: new Date(),
      lastUpdated: new Date(),
      apiSource: "google_books",
    });
  }

  return book;
};

// Find or create book from Open Library data
BookSchema.statics.findOrCreateFromOpenLibrary = async function (
  openLibraryData: any
) {
  const openLibraryId = openLibraryData.openLibraryId;
  const openLibraryKey = openLibraryData.key;

  let book = await this.findOne({ openLibraryId });

  if (book) {
    // Update last accessed and usage count
    book.usageCount += 1;
    book.lastAccessed = new Date();

    // Update cache if stale
    if (book.isCacheStale()) {
      book.volumeInfo = openLibraryData.volumeInfo;
      book.openLibraryKey = openLibraryKey;
      book.lastUpdated = new Date();
    }

    await book.save();
  } else {
    // Create new book entry
    book = await this.create({
      openLibraryId,
      openLibraryKey,
      volumeInfo: openLibraryData.volumeInfo,
      cachedAt: new Date(),
      lastUpdated: new Date(),
      apiSource: "open_library",
    });
  }

  return book;
};

// =====================================================
// Model Export
// =====================================================

const Book = ((mongoose.models && mongoose.models.Book) ||
  mongoose.model<IBook, IBookModel>("Book", BookSchema)) as IBookModel;

export default Book;
