import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { setSession } from '@/lib/auth/jwt-session';

const GO_API = process.env.NEXT_PUBLIC_API_URL ?? 'https://paperboxd-backend-production-d9e0.up.railway.app';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? '';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  if (action !== 'google-sync') {
    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, logout: true });
  }

  try {
    const resp = await fetch(`${GO_API}/api/v1/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': INTERNAL_SECRET,
      },
      body: JSON.stringify({
        email: session.user.email,
        name: session.user.name ?? '',
        avatar_url: session.user.image ?? '',
      }),
    });

    if (!resp.ok) {
      console.error('[backend-auth] go backend returned', resp.status);
      return NextResponse.json({ success: false, logout: true });
    }

    const data = await resp.json();

    await setSession(data.access_token, data.refresh_token, {
      id: data.user.id,
      username: data.user.username,
      email: data.user.email,
      name: data.user.name ?? '',
      avatar_url: data.user.avatar_url ?? undefined,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[backend-auth] failed to call go backend:', err);
    return NextResponse.json({ success: false, logout: true });
  }
}
