import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Newsletter from '@/lib/db/models/Newsletter';

export const dynamic = "force-dynamic";

/**
 * POST /api/newsletter/subscribe
 *
 * Subscribe an email to the newsletter.
 * Public endpoint - no authentication required.
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, source } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existing = await Newsletter.findOne({ email: normalizedEmail });

    if (existing) {
      // If already subscribed and active, return success (idempotent)
      if (existing.isActive) {
        return NextResponse.json({
          success: true,
          message: 'You are already subscribed to our newsletter!',
          alreadySubscribed: true,
        });
      }

      // If unsubscribed, reactivate the subscription
      existing.isActive = true;
      existing.subscribedAt = new Date();
      existing.unsubscribedAt = undefined;
      if (source) {
        existing.source = source;
      }
      await existing.save();

      return NextResponse.json({
        success: true,
        message: 'Welcome back! You have been resubscribed to our newsletter.',
        resubscribed: true,
      });
    }

    // Create new subscription
    const newsletter = new Newsletter({
      email: normalizedEmail,
      source: source || 'footer',
      isActive: true,
      subscribedAt: new Date(),
    });

    await newsletter.save();

    return NextResponse.json({
      success: true,
      message: 'Thank you for subscribing to our newsletter!',
    });
  } catch (error: unknown) {
    console.error('Error subscribing to newsletter:', error);

    // Handle duplicate key error (race condition)
    const isMongoError = error && typeof error === 'object' && ('code' in error || 'name' in error);
    if (isMongoError && ((error as { code?: number }).code === 11000 || (error as { name?: string }).name === 'MongoServerError')) {
      return NextResponse.json({
        success: true,
        message: 'You are already subscribed to our newsletter!',
        alreadySubscribed: true,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to subscribe to newsletter',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

