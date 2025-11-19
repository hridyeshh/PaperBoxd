# MongoDB Atlas Setup Guide for PaperBoxd

This guide will help you set up MongoDB Atlas integration for the PaperBoxd application.

## Overview

The PaperBoxd database consists of two main collections:

1. **Users Collection** - Stores all user-specific data (profiles, books read, TBR, liked books, reading lists, etc.)
2. **Books Collection** - Caches Google Books API responses to minimize API calls and improve performance

---

## 1. Setting Up MongoDB Atlas

### Step 1: Create a MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account (M0 Sandbox tier)
3. Create a new project (e.g., "PaperBoxd")

### Step 2: Create a Cluster

1. Click "Build a Database"
2. Choose the FREE tier (M0 Sandbox)
3. Select your preferred cloud provider and region
4. Click "Create Cluster"

### Step 3: Configure Database Access

1. In the sidebar, go to "Database Access"
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create a username and secure password
5. Set permissions to "Read and write to any database"
6. Click "Add User"

### Step 4: Configure Network Access

1. In the sidebar, go to "Network Access"
2. Click "Add IP Address"
3. For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
   - **Important**: For production, restrict to specific IP addresses
4. Click "Confirm"

### Step 5: Get Your Connection String

1. Click "Database" in the sidebar
2. Click "Connect" on your cluster
3. Select "Connect your application"
4. Choose "Node.js" as driver and latest version
5. Copy the connection string (should look like):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<username>` and `<password>` with your database user credentials
7. Add your database name (e.g., `paperboxd`) before the `?`:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/paperboxd?retryWrites=true&w=majority
   ```

---

## 2. Environment Variables Setup

### Step 1: Configure `.env.local`

Open `.env.local` file and update the following:

```bash
# MongoDB Atlas Configuration
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/paperboxd?retryWrites=true&w=majority

# Google Books API Configuration
GOOGLE_BOOKS_API_KEY=your_google_books_api_key_here

# NextAuth Configuration (for future authentication)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_key_here
```

### Step 2: Get Google Books API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Books API"
4. Go to "Credentials" and create an API key
5. Copy the API key to `.env.local`

### Step 3: Generate NextAuth Secret (optional, for future use)

```bash
openssl rand -base64 32
```

Copy the output to `NEXTAUTH_SECRET` in `.env.local`

---

## 3. Database Schema Overview

### Users Collection

Stores comprehensive user data:

```typescript
{
  // Authentication & Profile
  email: string (unique)
  password: string (hashed)
  username: string (unique)
  name: string
  avatar?: string
  bio?: string
  birthday?: Date
  gender?: string
  pronouns: string[]
  links?: string[]
  isPublic: boolean

  // Social
  followers: ObjectId[] (User references)
  following: ObjectId[] (User references)

  // Books & Reading
  topBooks: BookReference[] (4-6 favorite books)
  favoriteBooks: BookReference[] (up to 12)
  bookshelf: BookshelfBook[] (finished books with ratings/thoughts)
  likedBooks: LikedBook[] (starred books)
  tbrBooks: TbrBook[] (to-be-read with urgency)
  currentlyReading: BookReference[]

  // Reading Lists
  readingLists: [{
    title: string
    description?: string
    books: ObjectId[] (Book references)
    isPublic: boolean
    createdAt: Date
    updatedAt: Date
  }]

  // Activity & Statistics
  activities: Activity[]
  authorsRead: AuthorStats[]
  totalBooksRead: number
  totalPagesRead: number
  readingGoal?: {
    year: number
    target: number
    current: number
  }

  // Metadata
  createdAt: Date
  updatedAt: Date
  lastActive: Date
}
```

### Books Collection

Caches Google Books API data:

```typescript
{
  // Google Books ID (unique)
  googleBooksId: string (unique, indexed)

  // Volume Information (from Google Books API)
  volumeInfo: {
    title: string
    subtitle?: string
    authors: string[]
    publisher?: string
    publishedDate?: string
    description?: string
    industryIdentifiers?: [{type: string, identifier: string}]
    pageCount?: number
    categories?: string[]
    averageRating?: number
    ratingsCount?: number
    language?: string
    imageLinks?: {
      smallThumbnail?: string
      thumbnail?: string
      small?: string
      medium?: string
      large?: string
      extraLarge?: string
    }
    previewLink?: string
    infoLink?: string
    canonicalVolumeLink?: string
  }

  // Sale Information
  saleInfo?: {
    country?: string
    saleability?: string
    isEbook?: boolean
    listPrice?: {amount: number, currencyCode: string}
    retailPrice?: {amount: number, currencyCode: string}
    buyLink?: string
  }

  // Caching Metadata
  cachedAt: Date
  lastUpdated: Date
  apiSource: "google_books"
  usageCount: number (tracks how often referenced)
  lastAccessed: Date

  // Paperboxd-specific Statistics
  paperboxdRating?: number (average from all users)
  paperboxdRatingsCount?: number
  totalReads?: number
  totalLikes?: number
  totalTBR?: number

  // Metadata
  createdAt: Date
  updatedAt: Date
}
```

---

## 4. API Endpoints

### Books API (Google Books with Caching)

#### Search Books
```
GET /api/books/search?q={query}&maxResults={num}&startIndex={offset}
```

**Example:**
```bash
curl http://localhost:3000/api/books/search?q=harry+potter&maxResults=10
```

**Response:**
```json
{
  "kind": "books#volumes",
  "totalItems": 10,
  "items": [...],
  "fromCache": false
}
```

#### Get Book by ID
```
GET /api/books/{googleBooksId}
```

**Example:**
```bash
curl http://localhost:3000/api/books/abc123
```

**Response:**
```json
{
  "id": "abc123",
  "volumeInfo": {...},
  "saleInfo": {...},
  "paperboxdStats": {
    "rating": 4.5,
    "ratingsCount": 123,
    "totalReads": 456,
    "totalLikes": 78,
    "totalTBR": 90
  },
  "fromCache": true
}
```

---

### Users API

#### Register User
```
POST /api/users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "username": "bookworm",
  "name": "John Doe"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword",
    "username": "bookworm",
    "name": "John Doe"
  }'
```

#### Get User Profile
```
GET /api/users/{username}
```

**Example:**
```bash
curl http://localhost:3000/api/users/bookworm
```

#### Update User Profile
```
PATCH /api/users/{username}
Content-Type: application/json

{
  "bio": "Book lover and coffee enthusiast",
  "pronouns": ["they", "them"],
  "isPublic": true
}
```

**Example:**
```bash
curl -X PATCH http://localhost:3000/api/users/bookworm \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Book lover",
    "pronouns": ["they", "them"]
  }'
```

---

### User Books API

#### Add Book to Collection
```
POST /api/users/{username}/books
Content-Type: application/json

{
  "googleBooksId": "abc123",
  "type": "bookshelf",  // "bookshelf" | "tbr" | "liked" | "top" | "favorite" | "currently_reading"

  // For bookshelf:
  "finishedOn": "2024-01-15",
  "rating": 5,
  "thoughts": "Amazing book!",
  "format": "Print",  // "Print" | "Digital" | "Audio"

  // For TBR:
  "urgency": "Soon",  // "Soon" | "Eventually" | "This weekend"
  "whyNow": "Everyone's talking about it",

  // For liked:
  "reason": "Beautiful writing"
}
```

**Example - Add to Bookshelf:**
```bash
curl -X POST http://localhost:3000/api/users/bookworm/books \
  -H "Content-Type: application/json" \
  -d '{
    "googleBooksId": "abc123",
    "type": "bookshelf",
    "finishedOn": "2024-01-15",
    "rating": 5,
    "thoughts": "Absolutely loved it!",
    "format": "Print"
  }'
```

**Example - Add to TBR:**
```bash
curl -X POST http://localhost:3000/api/users/bookworm/books \
  -H "Content-Type: application/json" \
  -d '{
    "googleBooksId": "def456",
    "type": "tbr",
    "urgency": "Soon",
    "whyNow": "Heard great reviews"
  }'
```

#### Get User's Books
```
GET /api/users/{username}/books?type={type}&limit={num}&offset={num}
```

**Example:**
```bash
# Get bookshelf (page 1, 10 items)
curl http://localhost:3000/api/users/bookworm/books?type=bookshelf&limit=10&offset=0

# Get TBR list
curl http://localhost:3000/api/users/bookworm/books?type=tbr&limit=12&offset=0
```

---

### Reading Lists API

#### Create Reading List
```
POST /api/users/{username}/lists
Content-Type: application/json

{
  "title": "Summer 2024 Reads",
  "description": "Books I want to read this summer",
  "books": ["googleBooksId1", "googleBooksId2"],
  "isPublic": true
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/users/bookworm/lists \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Summer 2024 Reads",
    "description": "Beach reads",
    "isPublic": true
  }'
```

#### Get User's Reading Lists
```
GET /api/users/{username}/lists
```

**Example:**
```bash
curl http://localhost:3000/api/users/bookworm/lists
```

---

## 5. Testing the Setup

### Step 1: Start Development Server

```bash
npm run dev
```

### Step 2: Test Database Connection

The connection will be automatically tested when you make your first API call. Check the console for:
```
✅ Connected to MongoDB Atlas
```

### Step 3: Test User Registration

```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "username": "testuser",
    "name": "Test User"
  }'
```

### Step 4: Test Book Search

```bash
curl http://localhost:3000/api/books/search?q=harry+potter&maxResults=5
```

### Step 5: Verify in MongoDB Atlas

1. Go to MongoDB Atlas dashboard
2. Click "Browse Collections"
3. You should see:
   - `users` collection with your test user
   - `books` collection with cached books from search

---

## 6. Caching Strategy

### How it Works:

1. **First Request**: Book data is fetched from Google Books API and cached in MongoDB
2. **Subsequent Requests**: Book data is served from MongoDB cache (faster, no API calls)
3. **Cache Refresh**: If cache is older than 30 days, it's automatically refreshed
4. **Usage Tracking**: Each access increments `usageCount` and updates `lastAccessed`

### Benefits:

- Reduced API calls to Google Books
- Faster response times
- Works even if Google Books API is down
- Track popular books via `usageCount`
- Aggregate Paperboxd-specific statistics

---

## 7. Database Indexes

Performance-optimized indexes are automatically created:

### Users Collection
- `email` (unique)
- `username` (unique)
- `bookshelf.bookId`
- `likedBooks.bookId`
- `tbrBooks.bookId`
- `followers`
- `following`

### Books Collection
- `googleBooksId` (unique)
- Full-text search on `title` and `authors`
- `authors`
- `categories`
- `cachedAt`
- `lastAccessed`

---

## 8. Next Steps

### Implement Authentication

Consider using NextAuth.js for user authentication:

```bash
npm install next-auth
```

Then create `/app/api/auth/[...nextauth]/route.ts` for authentication handling.

### Add Middleware for Protected Routes

Create middleware to protect API routes that require authentication.

### Implement File Upload for Avatars

Use services like:
- **Cloudinary** (recommended)
- **AWS S3**
- **Vercel Blob Storage**

### Add Social Features

- Follow/unfollow users
- Activity feeds
- Comments and reviews
- Book recommendations

### Implement Search

- Full-text search across books
- User search
- Advanced filtering

---

## 9. Common Issues & Solutions

### Issue: "MONGODB_URI is not defined"

**Solution:** Make sure `.env.local` exists and contains `MONGODB_URI`

### Issue: Connection timeout

**Solution:**
- Check your IP is whitelisted in MongoDB Atlas Network Access
- Verify connection string is correct

### Issue: "User already exists"

**Solution:** Email or username already registered. Use different credentials.

### Issue: Google Books API error

**Solution:**
- Verify `GOOGLE_BOOKS_API_KEY` is set in `.env.local`
- Check API key is valid in Google Cloud Console
- Ensure Books API is enabled

---

## 10. Production Deployment

### Environment Variables

Set these in your production environment (Vercel, Netlify, etc.):

```bash
MONGODB_URI=your_production_mongodb_uri
GOOGLE_BOOKS_API_KEY=your_api_key
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_production_secret
```

### Security Checklist

- [ ] Use strong database passwords
- [ ] Restrict IP access in MongoDB Atlas to your server IPs
- [ ] Enable MongoDB Atlas backup
- [ ] Use environment-specific databases (dev, staging, prod)
- [ ] Implement rate limiting on API routes
- [ ] Add authentication middleware
- [ ] Validate all user inputs
- [ ] Sanitize data before database queries
- [ ] Use HTTPS only

---

## 11. Monitoring & Maintenance

### MongoDB Atlas Monitoring

- View performance metrics in Atlas dashboard
- Set up alerts for high CPU/memory usage
- Monitor connection pooling

### Database Maintenance

- Regularly clean up old cached books (if needed)
- Archive inactive user accounts
- Backup database regularly (Atlas does this automatically)

### Performance Optimization

- Monitor slow queries in Atlas
- Add indexes for frequently queried fields
- Consider aggregation pipelines for complex queries

---

## Support

For issues or questions:
- MongoDB Atlas: https://docs.atlas.mongodb.com/
- Google Books API: https://developers.google.com/books
- Next.js: https://nextjs.org/docs

---

**Happy coding! 📚**
