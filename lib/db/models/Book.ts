import mongoose, { Schema, Document, Model } from "mongoose";

// =====================================================
// Type Definitions
// =====================================================

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
  authors?: string[];
  description?: string;
  publishedDate?: string;
  averageRating?: number;
  ratingsCount?: number;
  pageCount?: number;
  categories?: string[];
  publisher?: string;
  imageLinks?: IImageLinks;
}

export interface IBook extends Document {
  isbn?: string;
  isbn13?: string;
  isbndbId?: string;
  openLibraryId?: string;
  volumeInfo: IVolumeInfo;
  apiSource?: "isbndb" | "open_library" | "google";
  usageCount: number;
  lastAccessed?: Date;
  lastUpdated?: Date;
  // Paperboxd community stats
  paperboxdRating?: number;
  paperboxdRatingsCount?: number;
  totalReads?: number;
  totalLikes?: number;
  totalTBR?: number;
  createdAt: Date;
  updatedAt: Date;
  // Instance methods
  isCacheStale(): boolean;
  updateStats(type: "tbr" | "read" | "like" | "rating", ratingValue?: number): Promise<this>;
}

export type BookData = {
  volumeInfo: IVolumeInfo;
  isbn?: string;
  isbn13?: string;
  isbndbId?: string;
  openLibraryId?: string;
  apiSource?: "isbndb" | "open_library" | "google";
};

interface IBookModel extends Model<IBook> {
  findOrCreateFromISBNdb(data: BookData): Promise<IBook>;
  findOrCreateFromOpenLibrary(data: BookData): Promise<IBook>;
}

// =====================================================
// Schema
// =====================================================

const ImageLinksSchema = new Schema<IImageLinks>(
  {
    smallThumbnail: { type: String },
    thumbnail: { type: String },
    small: { type: String },
    medium: { type: String },
    large: { type: String },
    extraLarge: { type: String },
  },
  { _id: false }
);

const VolumeInfoSchema = new Schema<IVolumeInfo>(
  {
    title: { type: String, required: true },
    authors: [{ type: String }],
    description: { type: String },
    publishedDate: { type: String },
    averageRating: { type: Number },
    ratingsCount: { type: Number },
    pageCount: { type: Number },
    categories: [{ type: String }],
    publisher: { type: String },
    imageLinks: { type: ImageLinksSchema },
  },
  { _id: false }
);

const BookSchema = new Schema<IBook>(
  {
    isbn: { type: String, index: true },
    isbn13: { type: String, index: true },
    isbndbId: { type: String, index: true, sparse: true },
    openLibraryId: { type: String, index: true, sparse: true },
    volumeInfo: { type: VolumeInfoSchema, required: true },
    apiSource: {
      type: String,
      enum: ["isbndb", "open_library", "google"],
    },
    usageCount: { type: Number, default: 0 },
    lastAccessed: { type: Date },
    lastUpdated: { type: Date },
    // Community stats
    paperboxdRating: { type: Number },
    paperboxdRatingsCount: { type: Number, default: 0 },
    totalReads: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    totalTBR: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// =====================================================
// Instance Methods
// =====================================================

/** Returns true if cached data is older than 30 days */
BookSchema.methods.isCacheStale = function (): boolean {
  if (!this.lastUpdated) return true;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - this.lastUpdated.getTime() > thirtyDays;
};

/** Updates community stats for the book */
BookSchema.methods.updateStats = async function (
  type: "tbr" | "read" | "like" | "rating",
  ratingValue?: number
): Promise<IBook> {
  if (type === "tbr") {
    this.totalTBR = (this.totalTBR || 0) + 1;
  } else if (type === "read") {
    this.totalReads = (this.totalReads || 0) + 1;
  } else if (type === "like") {
    this.totalLikes = (this.totalLikes || 0) + 1;
  } else if (type === "rating" && typeof ratingValue === "number") {
    const currentCount = this.paperboxdRatingsCount || 0;
    const currentRating = this.paperboxdRating || 0;
    const newTotal = (currentRating * currentCount) + ratingValue;
    this.paperboxdRatingsCount = currentCount + 1;
    this.paperboxdRating = newTotal / this.paperboxdRatingsCount;
  }
  return this.save();
};

// =====================================================
// Static Methods
// =====================================================

BookSchema.statics.findOrCreateFromISBNdb = async function (
  data: BookData
): Promise<IBook> {
  const filter: Record<string, unknown> = {};
  if (data.isbndbId) filter.isbndbId = data.isbndbId;
  else if (data.isbn13) filter.isbn13 = data.isbn13;
  else if (data.isbn) filter.isbn = data.isbn;
  else filter["volumeInfo.title"] = data.volumeInfo.title;

  const update = {
    $set: {
      volumeInfo: data.volumeInfo,
      apiSource: "isbndb" as const,
      lastUpdated: new Date(),
      ...(data.isbn && { isbn: data.isbn }),
      ...(data.isbn13 && { isbn13: data.isbn13 }),
      ...(data.isbndbId && { isbndbId: data.isbndbId }),
      ...(data.openLibraryId && { openLibraryId: data.openLibraryId }),
    },
    $inc: { usageCount: 1 },
    $setOnInsert: {
      paperboxdRatingsCount: 0,
      totalReads: 0,
      totalLikes: 0,
      totalTBR: 0,
    },
  };

  return this.findOneAndUpdate(filter, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  }) as Promise<IBook>;
};

BookSchema.statics.findOrCreateFromOpenLibrary = async function (
  data: BookData
): Promise<IBook> {
  const filter: Record<string, unknown> = {};
  if (data.openLibraryId) filter.openLibraryId = data.openLibraryId;
  else if (data.isbn13) filter.isbn13 = data.isbn13;
  else if (data.isbn) filter.isbn = data.isbn;
  else filter["volumeInfo.title"] = data.volumeInfo.title;

  const update = {
    $set: {
      volumeInfo: data.volumeInfo,
      apiSource: "open_library" as const,
      lastUpdated: new Date(),
      ...(data.isbn && { isbn: data.isbn }),
      ...(data.isbn13 && { isbn13: data.isbn13 }),
      ...(data.isbndbId && { isbndbId: data.isbndbId }),
      ...(data.openLibraryId && { openLibraryId: data.openLibraryId }),
    },
    $inc: { usageCount: 1 },
    $setOnInsert: {
      paperboxdRatingsCount: 0,
      totalReads: 0,
      totalLikes: 0,
      totalTBR: 0,
    },
  };

  return this.findOneAndUpdate(filter, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  }) as Promise<IBook>;
};

// =====================================================
// Model Export
// =====================================================

const Book: IBookModel =
  (mongoose.models && mongoose.models.Book as IBookModel) ||
  mongoose.model<IBook, IBookModel>("Book", BookSchema);

export default Book;
