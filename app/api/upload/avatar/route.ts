import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/auth-token';
import { uploadToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } from '@/lib/cloudinary';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';

/**
 * POST /api/upload/avatar
 * Upload user avatar to Cloudinary
 * Requires authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Support both Bearer token (mobile) and NextAuth session (web)
    let userId: string | null = null;
    let userEmail: string | null = null;
    
    // Try Bearer token first (for mobile apps)
    const authUser = await getUserFromRequest(request);
    if (authUser) {
      userId = authUser.id;
      userEmail = authUser.email;
      console.log('[Avatar Upload] Authenticated via Bearer token:', { userId, userEmail });
    } else {
      // Fall back to NextAuth session (for web)
      const session = await auth();
      if (session?.user?.id) {
        userId = session.user.id;
        userEmail = session.user.email || null;
        console.log('[Avatar Upload] Authenticated via NextAuth session:', { userId, userEmail });
      }
    }

    if (!userId) {
      console.error('[Avatar Upload] No authentication found');
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Please sign in to upload an avatar' },
        { status: 401 }
      );
    }

    // Support both JSON (web) and multipart/form-data (iOS)
    let imageDataUri: string;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form data (iOS app)
      console.log('[Avatar Upload] Parsing multipart form data');
      const formData = await request.formData();
      const avatarFile = formData.get('avatar') as File | null;

      if (!avatarFile) {
        return NextResponse.json(
          { error: 'No image provided. Expected field name: "avatar"' },
          { status: 400 }
        );
      }

      // Check file size (limit to 5MB)
      if (avatarFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Image too large. Maximum size is 5MB.' },
          { status: 400 }
        );
      }

      // Convert File to base64 data URI
      const arrayBuffer = await avatarFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      const mimeType = avatarFile.type || 'image/jpeg';
      imageDataUri = `data:${mimeType};base64,${base64}`;
      console.log('[Avatar Upload] Converted multipart file to data URI, size:', avatarFile.size, 'bytes');
    } else {
      // Handle JSON with base64 data URI (web)
      console.log('[Avatar Upload] Parsing JSON body');
      const body = await request.json();
      const { image } = body;

      if (!image) {
        return NextResponse.json(
          { error: 'No image provided' },
          { status: 400 }
        );
      }

      // Validate image is base64 or data URI
      if (!image.startsWith('data:image/')) {
        return NextResponse.json(
          { error: 'Invalid image format. Must be a data URI.' },
          { status: 400 }
        );
      }

      // Check file size (limit to 5MB in base64)
      const sizeInBytes = (image.length * 3) / 4;
      const sizeInMB = sizeInBytes / (1024 * 1024);

      if (sizeInMB > 5) {
        return NextResponse.json(
          { error: 'Image too large. Maximum size is 5MB.' },
          { status: 400 }
        );
      }

      imageDataUri = image;
    }

    await connectDB();

    // Debug logging
    console.log('[Avatar Upload] User ID:', userId);
    console.log('[Avatar Upload] User:', {
      id: userId,
      email: userEmail,
    });

    // Get user's current avatar to delete old one
    // Try to find user by ID
    let user = await User.findById(userId).select('avatar');
    
    // If not found by ID, try to find by email as fallback
    if (!user && userEmail) {
      console.log('[Avatar Upload] User not found by ID, trying email:', userEmail);
      user = await User.findOne({ email: userEmail.toLowerCase() }).select('avatar');
    }

    if (!user) {
      console.error('[Avatar Upload] User not found in database:', {
        userId,
        email: userEmail,
      });
      return NextResponse.json(
        { 
          error: 'User not found',
          details: 'Your account may not exist in the database. Please try signing out and signing in again.',
        },
        { status: 404 }
      );
    }

    console.log('[Avatar Upload] Found user:', {
      id: (user._id as mongoose.Types.ObjectId).toString(),
      email: user.email,
      hasAvatar: !!user.avatar,
    });

    // Delete old avatar from Cloudinary if it exists
    if (user.avatar && user.avatar.includes('cloudinary.com')) {
      const oldPublicId = getPublicIdFromUrl(user.avatar);
      if (oldPublicId) {
        try {
          await deleteFromCloudinary(oldPublicId);
        } catch (error) {
          console.error('Failed to delete old avatar:', error);
          // Continue anyway - don't fail upload if delete fails
        }
      }
    }

    // Upload new avatar to Cloudinary
    // Use user ID as public ID for easy management
    const result = await uploadToCloudinary(
      imageDataUri,
      'paperboxd/avatars',
      `user_${userId}`
    );

    // Update user's avatar in database
    user.avatar = result.secureUrl;
    user.updatedAt = new Date();
    await user.save();

    return NextResponse.json({
      success: true,
      avatar: result.secureUrl,
      message: 'Avatar uploaded successfully',
    });
  } catch (error: unknown) {
    console.error('Avatar upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to upload avatar',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/upload/avatar
 * Delete user avatar
 * Requires authentication
 */
export async function DELETE(request: NextRequest) {
  try {
    // Support both Bearer token (mobile) and NextAuth session (web)
    let userId: string | null = null;
    
    // Try Bearer token first (for mobile apps)
    const authUser = await getUserFromRequest(request);
    if (authUser) {
      userId = authUser.id;
      console.log('[Avatar Delete] Authenticated via Bearer token:', { userId });
    } else {
      // Fall back to NextAuth session (for web)
      const session = await auth();
      if (session?.user?.id) {
        userId = session.user.id;
        console.log('[Avatar Delete] Authenticated via NextAuth session:', { userId });
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findById(userId).select('avatar');

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete from Cloudinary if it exists
    if (user.avatar && user.avatar.includes('cloudinary.com')) {
      const publicId = getPublicIdFromUrl(user.avatar);
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId);
        } catch (error) {
          console.error('Failed to delete avatar from Cloudinary:', error);
        }
      }
    }

    // Remove avatar from database
    user.avatar = undefined;
    user.updatedAt = new Date();
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Avatar deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Avatar delete error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to delete avatar',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
