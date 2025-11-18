import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

/**
 * GET /api/test/cloudinary
 * Test Cloudinary configuration and connection
 */
export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    const envCheck = {
      cloudName: cloudName ? '✅ Set' : '❌ Missing',
      apiKey: apiKey ? '✅ Set' : '❌ Missing',
      apiSecret: apiSecret ? '✅ Set' : '❌ Missing',
    };

    // If any are missing, return early
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({
        success: false,
        message: 'Cloudinary environment variables are missing',
        envCheck,
        error: 'Please add CLOUDINARY environment variables to .env.local',
      }, { status: 400 });
    }

    // Test Cloudinary connection by getting account details
    try {
      const result = await cloudinary.api.ping();
      
      return NextResponse.json({
        success: true,
        message: 'Cloudinary is configured and working!',
        envCheck,
        cloudinaryStatus: result.status === 'ok' ? '✅ Connected' : '❌ Connection failed',
        accountInfo: {
          cloudName: cloudName,
          // Don't expose sensitive data
          apiKeyPrefix: apiKey.substring(0, 4) + '***',
        },
      });
    } catch (cloudinaryError: any) {
      return NextResponse.json({
        success: false,
        message: 'Cloudinary configuration error',
        envCheck,
        error: cloudinaryError.message || 'Unknown error',
        details: 'Check your Cloudinary credentials in .env.local',
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: 'Failed to test Cloudinary',
      error: error.message || 'Unknown error',
    }, { status: 500 });
  }
}

