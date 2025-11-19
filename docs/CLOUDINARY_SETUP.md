# Cloudinary Avatar Upload - Setup Guide

## What Was Implemented

The profile photo upload system has been integrated with Cloudinary for efficient, cloud-based image storage and optimization.

### Changes Made

1. **Backend API** (`/app/api/upload/avatar/route.ts`):
   - POST endpoint: Upload avatar to Cloudinary
   - DELETE endpoint: Remove avatar from Cloudinary
   - Automatic deletion of old avatars when uploading new ones
   - Face detection and smart cropping (500x500)
   - Auto quality and format optimization
   - 5MB file size limit

2. **Frontend Component** (`/components/ui/forms/edit-profile-form.tsx`):
   - Integrated Cloudinary upload on file selection
   - Real-time upload progress with loading states
   - Error handling with user-friendly messages
   - Remove avatar functionality
   - Image validation (type and size)

3. **Profile Page** (`/app/u/[username]/page.tsx`):
   - Re-enabled avatar saving (now uses URLs instead of base64)
   - Avatar URLs are much smaller than data URIs, avoiding cookie size issues

4. **Cloudinary Helper Library** (`/lib/cloudinary.ts`):
   - `uploadToCloudinary()` - Upload with transformations
   - `deleteFromCloudinary()` - Delete from cloud storage
   - `getPublicIdFromUrl()` - Extract public ID from URL

## Setup Instructions

### 1. Create Cloudinary Account

1. Go to [cloudinary.com](https://cloudinary.com)
2. Sign up for a free account
3. Navigate to your dashboard

### 2. Get Your Credentials

From your Cloudinary dashboard, copy:
- **Cloud Name** (appears at the top)
- **API Key** (in Account Details)
- **API Secret** (in Account Details - click "Show")

### 3. Add Credentials to .env.local

Replace the placeholder values in your `.env.local` file:

```env
# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-actual-cloud-name
CLOUDINARY_API_KEY=your-actual-api-key
CLOUDINARY_API_SECRET=your-actual-api-secret
```

**Important**: Replace `your-actual-cloud-name`, `your-actual-api-key`, and `your-actual-api-secret` with the real values from your Cloudinary dashboard.

### 4. Restart Development Server

After adding the credentials:

```bash
# Stop the server (Ctrl+C)
# Then restart it
npm run dev
```

## How It Works

### Upload Flow

1. User selects an image in the edit profile form
2. Image is converted to base64 data URI
3. Frontend sends base64 to `/api/upload/avatar`
4. Backend uploads to Cloudinary with transformations:
   - Resized to 500x500
   - Smart cropping with face detection
   - Auto quality and format
   - Stored in `paperboxd/avatars/` folder
   - Public ID: `user_{userId}`
5. Cloudinary returns secure URL
6. URL is saved to user's profile in MongoDB
7. Old avatar (if exists) is automatically deleted

### Delete Flow

1. User clicks "Remove" button
2. Frontend calls DELETE `/api/upload/avatar`
3. Backend deletes image from Cloudinary
4. Avatar field removed from user's profile

## Features

### Automatic Optimization

- **Face Detection**: Smart cropping focuses on faces
- **Auto Format**: Serves WebP for browsers that support it
- **Auto Quality**: Balances quality and file size
- **Compression**: Reduces bandwidth and load times

### Storage Management

- **Overwrite**: New uploads overwrite old ones (same public ID)
- **Auto Cleanup**: Old avatars deleted before new upload
- **Organized**: All avatars in `paperboxd/avatars/` folder

### User Experience

- **Loading States**: Shows spinner during upload
- **Error Handling**: Clear error messages
- **Size Validation**: 5MB limit enforced
- **Type Validation**: Only image files accepted
- **Preview**: Immediate preview of uploaded avatar

## Image Transformations

Default transformations applied to all uploaded avatars:

```typescript
{
  width: 500,
  height: 500,
  crop: 'fill',
  gravity: 'face',      // Focus on faces when cropping
  quality: 'auto:good', // Automatic quality optimization
  fetch_format: 'auto', // WebP for supported browsers
}
```

## Folder Structure

```
Cloudinary Storage:
└── paperboxd/
    └── avatars/
        ├── user_673a1b2c4d5e6f7g8h9i0j1k  (User 1's avatar)
        ├── user_673a1b2c4d5e6f7g8h9i0j2l  (User 2's avatar)
        └── ...
```

## Testing

### Test the Upload

1. Sign in to your account
2. Go to your profile page
3. Click "Edit profile"
4. Click "Change photo" button
5. Select an image (JPG or PNG, max 5MB)
6. Wait for upload to complete
7. Click "Save changes"
8. Verify avatar appears on your profile

### Test the Delete

1. In edit profile form
2. Click "Remove" button
3. Click "Save changes"
4. Verify avatar is removed

## Troubleshooting

### "Failed to upload avatar" Error

**Check**:
1. Cloudinary credentials are correct in `.env.local`
2. Development server was restarted after adding credentials
3. Image is under 5MB
4. Image is a valid format (JPG, PNG, etc.)

### Avatar Not Saving

**Check**:
1. You're signed in
2. You clicked "Save changes" after uploading
3. No errors in browser console
4. MongoDB connection is working

### Upload Takes Too Long

**Possible causes**:
- Large image file (try a smaller image)
- Slow internet connection
- Cloudinary account limits (free tier has limits)

## Free Tier Limits

Cloudinary free tier includes:
- 25 GB storage
- 25 GB monthly bandwidth
- 25,000 transformations/month

This is more than enough for your MVP launch (0-10K users).

## Security

- API Secret is only used server-side (never exposed to client)
- Uploads require authentication
- Users can only update their own avatar
- File size and type validation prevent abuse
- Cloudinary URLs are permanent (won't break if user re-uploads)

## Next Steps

1. Add Cloudinary credentials to `.env.local`
2. Restart dev server
3. Test upload functionality
4. Consider adding cropper UI for better control (optional)
5. Monitor Cloudinary dashboard for usage

## Optional Enhancements

For future improvements, consider:
- Image cropper UI before upload (react-image-crop)
- Support for multiple image formats
- Compression before upload (browser-image-compression)
- Drag-and-drop upload
- Webcam capture for avatar
