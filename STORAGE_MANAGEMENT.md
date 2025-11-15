# Storage Management for Paperboxd

## MongoDB Free Tier Capacity (512MB)

### Estimated Capacity

Based on the current database schema, here's what you can expect with 512MB:

#### User Documents
- **Average size per user**: 15-30KB
  - Basic profile info: ~1KB
  - Book collections (bookshelf, TBR, likes): ~10-20KB (assuming 50-100 books)
  - Activities: ~2-5KB
  - Authors read: ~1-2KB
  - Social (followers/following): ~1-2KB

- **Estimated capacity**: **5,000-7,500 users**

#### Book Documents
- **Average size per book**: 5-20KB
  - Volume info (title, authors, description): ~5-15KB
  - Image links: ~0.5KB
  - Metadata and stats: ~0.5-1KB

- **Estimated capacity**: **18,000-36,000 books**

### Storage Allocation Strategy

For optimal performance with 512MB:
- **70% for Books** (~360MB): 18,000-36,000 books
- **30% for Users** (~150MB): 5,000-7,500 users

This allocation makes sense because:
1. Books are cached from Google Books API and can be re-fetched
2. User data is permanent and cannot be easily recovered
3. Many users will share references to the same books

## Automatic Cleanup System

To manage storage limits, Paperboxd includes an automatic book cleanup system that removes unused books every 15 days.

### How It Works

1. **Tracking**: Every book has a `lastAccessed` timestamp that updates when:
   - A user adds it to their bookshelf/TBR/likes
   - A user views the book details
   - The book is searched or displayed

2. **Cleanup**: Books not accessed in 15 days are automatically deleted
   - These books can be re-fetched from Google Books API if needed
   - User references to deleted books remain intact (with book ID)

### Setup Automatic Cleanup

#### Option 1: GitHub Actions (Recommended for Vercel/GitHub deployments)

Create `.github/workflows/cleanup-books.yml`:

```yaml
name: Cleanup Old Books

on:
  schedule:
    # Runs every day at 3 AM UTC
    - cron: '0 3 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Cleanup old books
        run: |
          curl -X DELETE \
            -H "Authorization: Bearer ${{ secrets.CLEANUP_SECRET }}" \
            https://your-domain.vercel.app/api/cleanup/books
```

**Setup**:
1. Add `CLEANUP_SECRET` to your GitHub repository secrets
2. Add the same secret to your `.env` file and Vercel environment variables

#### Option 2: External Cron Service (cron-job.org, EasyCron)

1. Sign up for a free cron service like [cron-job.org](https://cron-job.org)
2. Create a new cron job with:
   - **URL**: `https://your-domain.vercel.app/api/cleanup/books`
   - **Method**: DELETE
   - **Headers**: `Authorization: Bearer YOUR_CLEANUP_SECRET`
   - **Schedule**: Daily at 3 AM

#### Option 3: Vercel Cron Jobs (Paid plans)

If you upgrade to Vercel Pro, you can use native cron jobs:

Create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cleanup/books",
      "schedule": "0 3 * * *"
    }
  ]
}
```

### Manual Cleanup

You can trigger cleanup manually using these endpoints:

#### Check cleanup statistics:
```bash
curl https://your-domain.vercel.app/api/cleanup/books
```

#### Trigger cleanup:
```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_CLEANUP_SECRET" \
  https://your-domain.vercel.app/api/cleanup/books
```

### Environment Variables

Add to your `.env` file:

```env
# Optional: Secret token to protect cleanup endpoint
CLEANUP_SECRET=your-random-secret-token-here
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

## Monitoring Storage Usage

### MongoDB Atlas Dashboard

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com)
2. Select your cluster
3. Go to **Metrics** tab
4. Monitor:
   - Data Size
   - Storage Size
   - Number of Collections
   - Number of Documents

### API Endpoints for Monitoring

**Get cleanup statistics**:
```bash
GET /api/cleanup/books
```

Returns:
```json
{
  "totalBooks": 15000,
  "oldBooks": 500,
  "booksToKeep": 14500,
  "cutoffDate": "2025-01-01T00:00:00.000Z",
  "message": "500 books eligible for cleanup"
}
```

## Optimization Tips

### 1. Reduce Book Description Storage
Book descriptions can be very long. Consider:
- Truncating descriptions to 500 characters
- Not storing descriptions at all (fetch on-demand)

### 2. Image Links
Store only thumbnail URLs, not all image sizes:
```typescript
imageLinks: {
  thumbnail: book.volumeInfo.imageLinks?.thumbnail
}
```

### 3. User Activity Limits
Limit stored activities to last 100 instead of unlimited:
```typescript
if (user.activities.length > 100) {
  user.activities = user.activities.slice(-100);
}
```

### 4. Index Optimization
Only create necessary indexes:
- Users: username, email (already indexed)
- Books: googleBooksId, lastAccessed (for cleanup)

Avoid text indexes in free tier as they consume extra storage.

## Scaling Beyond 512MB

When you outgrow the free tier:

### MongoDB Atlas Pricing
- **M2**: $9/month - 2GB storage
- **M5**: $25/month - 5GB storage
- **M10**: $57/month - 10GB storage

### Alternative Solutions
1. **Upgrade to paid MongoDB**: Most straightforward
2. **Multiple databases**: Split books across multiple free clusters
3. **External storage**: Store images/large data in Cloudinary, R2, etc.
4. **Aggressive cleanup**: Reduce cleanup period to 7 days

## Current Implementation

✅ Automatic cleanup system implemented
✅ Cleanup API endpoints created
✅ Storage estimation documented
✅ Monitoring endpoints available

**Next Steps**:
1. Add `CLEANUP_SECRET` to your environment variables
2. Set up automated cleanup using one of the options above
3. Monitor storage usage in MongoDB Atlas
4. Adjust cleanup frequency as needed
