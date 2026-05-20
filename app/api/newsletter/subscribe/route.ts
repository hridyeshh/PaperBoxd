import { NextRequest, NextResponse } from 'next/server';
import { goFetch } from '@/lib/api/endpoints';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const { data, status } = await goFetch('/api/v1/newsletter/subscribe', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    if (status >= 500) {
      return NextResponse.json({ error: 'Failed to subscribe to newsletter' }, { status: 500 });
    }

    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    console.error('[Newsletter] subscribe error:', error);
    return NextResponse.json({ error: 'Failed to subscribe to newsletter' }, { status: 500 });
  }
}
