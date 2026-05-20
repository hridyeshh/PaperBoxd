import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const GO_API = process.env.NEXT_PUBLIC_API_URL ?? 'https://paperboxd-backend-production-d9e0.up.railway.app';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;
  if (!bookId) {
    return NextResponse.json({ similar: [] });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('pb_access_token')?.value ?? '';

  try {
    const res = await fetch(`${GO_API}/api/v1/recommendations/similar/${encodeURIComponent(bookId)}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ similar: [] });
    }

    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ similar: [] });
  }
}
