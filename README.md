# Paperboxd

A book tracking and social reading platform inspired by Letterboxd, built with Next.js, MongoDB, and the Google Books API.

## Features

- 📚 Track books you've read, want to read, and currently reading
- ⭐ Rate and review books
- 👥 Follow other readers and see their activity
- 📖 Create custom reading lists
- 🔍 Search and discover books via Google Books API
- 📊 Track reading statistics and author analytics
- 🎨 Beautiful, responsive UI with dark mode support

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Authentication**: NextAuth.js v5
- **Database**: MongoDB (Mongoose)
- **Styling**: Tailwind CSS
- **UI Components**: Custom components + Radix UI primitives
- **API**: Google Books API

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier works great!)
- Google Books API key (optional but recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd paperboxd
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

   Fill in the required values:
   ```env
   # MongoDB
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/paperboxd

   # NextAuth (generate with: openssl rand -base64 32)
   NEXTAUTH_SECRET=your-secret-here
   NEXTAUTH_URL=http://localhost:3000

   # Optional: Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret

   # Cleanup secret (generate with: openssl rand -base64 32)
   CLEANUP_SECRET=your-cleanup-secret

   # Google Books API
   GOOGLE_BOOKS_API_KEY=your-api-key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

### GitHub Actions Setup (Automatic Book Cleanup)

To enable automatic cleanup of old book data:

1. **Add GitHub Secrets**

   Go to your repository → Settings → Secrets and variables → Actions

   Add these secrets:
   - `CLEANUP_SECRET`: Same value as in your `.env` file
   - `APP_URL`: Your deployed app URL (e.g., `https://paperboxd.vercel.app`)

2. **The workflow is already configured** in `.github/workflows/cleanup-books.yml`

   It will run daily at 3 AM UTC to clean up books not accessed in 15 days.

3. **Manual trigger**

   You can manually trigger cleanup from the Actions tab in GitHub.

### Vercel Deployment

1. **Deploy to Vercel**
   ```bash
   vercel
   ```

2. **Add environment variables**

   In Vercel dashboard → Your Project → Settings → Environment Variables

   Add all variables from your `.env` file.

3. **Deploy**
   ```bash
   vercel --prod
   ```

## Storage Management

This app is designed to work within MongoDB's free tier (512MB). See [STORAGE_MANAGEMENT.md](./STORAGE_MANAGEMENT.md) for:

- Estimated capacity (5,000-7,500 users, 18,000-36,000 books)
- Automatic cleanup system details
- Monitoring and optimization tips
- Scaling strategies

### Quick Cleanup Commands

**Check what would be cleaned up:**
```bash
curl https://your-app.vercel.app/api/cleanup/books
```

**Manually trigger cleanup:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_CLEANUP_SECRET" \
  https://your-app.vercel.app/api/cleanup/books
```

## Project Structure

```
paperboxd/
├── app/                      # Next.js app router
│   ├── api/                  # API routes
│   │   ├── users/           # User endpoints
│   │   ├── books/           # Book endpoints
│   │   └── cleanup/         # Cleanup endpoints
│   ├── auth/                # Authentication pages
│   ├── profile/             # Profile pages
│   └── u/[username]/        # User profile pages
├── components/              # React components
│   └── ui/                  # UI components
├── lib/                     # Utilities and configurations
│   ├── db/                  # Database models and connection
│   │   └── models/         # Mongoose models
│   ├── auth.ts             # NextAuth configuration
│   └── utils.ts            # Utility functions
└── public/                  # Static files
```

## API Endpoints

### Users
- `GET /api/users/:username` - Get user profile
- `PATCH /api/users/:username` - Update user profile
- `POST /api/users/:username/follow` - Follow/unfollow user
- `POST /api/users/register` - Register new user

### Books
- `GET /api/books/search?q=query` - Search books
- `GET /api/books/:googleBooksId` - Get book details
- `POST /api/users/:username/books` - Add book to collection

### Cleanup
- `GET /api/cleanup/books` - Get cleanup statistics
- `DELETE /api/cleanup/books` - Trigger book cleanup

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Atlas](https://www.mongodb.com/atlas)
- [NextAuth.js](https://next-auth.js.org/)
- [Google Books API](https://developers.google.com/books)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
