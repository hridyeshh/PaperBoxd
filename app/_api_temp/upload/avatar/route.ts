import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/lib/auth';
import { uploadToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } from '@/lib/cloudinary';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/db/models/User';


export const dynamic = "force-static";

/**
 * POST /api/upload/avatar
 * Upload user avatar to Cloudinary
 * Requires authentication
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        console.log('[Avatar Upload] Raw session:', {
            hasSession: !!session,
            hasUser: !!session?.user,
            userId: session?.user?.id,
            userEmail: session?.user?.email,
            userUsername: session?.user?.username,
        });

        if (!session?.user?.id) {
            console.error('[Avatar Upload] No session or user ID');
            return NextResponse.json(
                { error: 'Unauthorized', details: 'Please sign in to upload an avatar' },
                { status: 401 }
            );
        }

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

        await connectDB();

        // Debug logging
        console.log('[Avatar Upload] Session user ID:', session.user.id);
        console.log('[Avatar Upload] Session user:', {
            id: session.user.id,
            email: session.user.email,
            username: session.user.username,
        });

        // Get user's current avatar to delete old one
        // Try to find user by ID
        let user = await User.findById(session.user.id).select('avatar');

        // If not found by ID, try to find by email as fallback
        if (!user && session.user.email) {
            console.log('[Avatar Upload] User not found by ID, trying email:', session.user.email);
            user = await User.findOne({ email: session.user.email.toLowerCase() }).select('avatar');
        }

        if (!user) {
            console.error('[Avatar Upload] User not found in database:', {
                userId: session.user.id,
                email: session.user.email,
                username: session.user.username,
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
            image,
            'paperboxd/avatars',
            `user_${session.user.id}`
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
export async function DELETE() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        await connectDB();

        const user = await User.findById(session.user.id).select('avatar');

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
