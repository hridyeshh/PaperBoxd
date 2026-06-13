import { NextResponse } from 'next/server';
import { goFetchAuthed } from '@/lib/api/endpoints';

export async function POST() {
  const { status } = await goFetchAuthed('/api/v1/users/me/daily-open', { method: 'POST' });
  return NextResponse.json({}, { status: status >= 400 ? status : 200 });
}
