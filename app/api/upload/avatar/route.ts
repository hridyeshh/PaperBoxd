import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { uploadToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } from '@/lib/cloudinary';
import { goFetchAuthed } from '@/lib/api/endpoints';

type GoUser = { id: string; avatar_url?: string };

async function getCurrentUser(): Promise<GoUser | null> {
  try {
    const { data, status } = await goFetchAuthed('/api/v1/users/me');
    if (status >= 400) return null;
    return data as GoUser;
  } catch {
    return null;
  }
}

async function deleteOldAvatar(avatarUrl: string | undefined) {
  if (!avatarUrl || !avatarUrl.includes('cloudinary.com')) return;
  const publicId = getPublicIdFromUrl(avatarUrl);
  if (publicId) {
    try {
      await deleteFromCloudinary(publicId);
    } catch (err) {
      console.error('[Avatar] Failed to delete old Cloudinary asset:', err);
    }
  }
}

/**
 * POST /api/upload/avatar
 * Upload user avatar to Cloudinary, then persist URL in Postgres via Go.
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('pb_access_token')?.value ?? '';
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }
    if (!image.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format. Must be a data URI.' }, { status: 400 });
    }

    const sizeInMB = ((image.length * 3) / 4) / (1024 * 1024);
    if (sizeInMB > 5) {
      return NextResponse.json({ error: 'Image too large. Maximum size is 5MB.' }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteOldAvatar(user.avatar_url);

    const result = await uploadToCloudinary(image, 'paperboxd/avatars', `user_${user.id}`);

    const { status } = await goFetchAuthed('/api/v1/users/me/avatar', {
      method: 'PATCH',
      body: JSON.stringify({ avatar_url: result.secureUrl }),
    });

    if (status >= 400) {
      console.error('[Avatar] Go PATCH returned', status);
      return NextResponse.json({ error: 'Failed to save avatar' }, { status: 500 });
    }

    return NextResponse.json({ success: true, avatar: result.secureUrl });
  } catch (error: unknown) {
    console.error('[Avatar] POST error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to upload avatar', details: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/upload/avatar
 * Remove user avatar from Cloudinary and clear the URL in Postgres.
 */
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('pb_access_token')?.value ?? '';
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteOldAvatar(user.avatar_url);

    await goFetchAuthed('/api/v1/users/me/avatar', {
      method: 'PATCH',
      body: JSON.stringify({ avatar_url: '' }),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[Avatar] DELETE error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to delete avatar', details: msg }, { status: 500 });
  }
}
