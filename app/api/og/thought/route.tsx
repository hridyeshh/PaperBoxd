import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Story card for a thought (1080×1920): warm paper card on white, the thought
// as the hero, the book underneath, the reader's handle at the foot. Same
// palette as the app's share cards so a thought posted from web or phone looks
// like one product.
const PAPER_TOP = '#f2eee7';
const PAPER_BOTTOM = '#d9c9ad';
const INK = '#1a140d';
const INK_SOFT = 'rgba(26,20,13,0.62)';

export async function GET(request: NextRequest) {
    const [interSemiBold, interBlack] = await Promise.all([
        fetch(new URL('https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hjp-Ek-_EeA.woff', import.meta.url)).then((r) => r.arrayBuffer()),
        fetch(new URL('https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuDyYAZ9hjp-Ek-_EeA.woff', import.meta.url)).then((r) => r.arrayBuffer()),
    ]);

    const p = request.nextUrl.searchParams;
    const text = (p.get('text') || '').slice(0, 600);
    const username = p.get('username') || 'reader';
    const book = p.get('book');
    const author = p.get('author');
    const cover = p.get('cover');
    const thread = p.get('thread'); // e.g. "1/3"

    // Long thoughts step the type down so the card never overflows.
    const size = text.length > 420 ? 40 : text.length > 260 ? 48 : text.length > 140 ? 58 : 70;

    return new ImageResponse(
        (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', padding: '150px 110px' }}>
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '72px',
                        padding: '72px',
                        backgroundImage: `linear-gradient(180deg, ${PAPER_TOP}, ${PAPER_BOTTOM})`,
                        boxShadow: '0 30px 70px rgba(0,0,0,0.18)',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: 40, color: INK, letterSpacing: '-0.02em' }}>PaperBoxd</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 12, backgroundColor: 'rgba(0,0,0,0.88)', color: PAPER_TOP, borderRadius: 999, padding: '14px 26px', fontFamily: 'Inter', fontWeight: 600, fontSize: 22, letterSpacing: '0.12em' }}>
                            {thread ? `THREAD ${thread}` : 'A THOUGHT'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
                        <span style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: 150, lineHeight: 0.8, color: INK, opacity: 0.18 }}>“</span>
                        <p style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: size, lineHeight: 1.28, color: INK, margin: 0, letterSpacing: '-0.01em', whiteSpace: 'pre-wrap' }}>
                            {text}
                        </p>
                    </div>

                    {book && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 28, borderTop: '2px solid rgba(26,20,13,0.16)', paddingTop: 40, marginBottom: 40 }}>
                            {cover ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={cover} width={96} height={144} style={{ objectFit: 'cover', borderRadius: 12 }} alt="" />
                            ) : null}
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <span style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: 36, color: INK, lineHeight: 1.15 }}>{book}</span>
                                {author && <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 26, color: INK_SOFT, marginTop: 8 }}>{author}</span>}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex' }}>
                        <span style={{ backgroundColor: 'rgba(0,0,0,0.9)', color: PAPER_TOP, borderRadius: 999, padding: '22px 34px', fontFamily: 'Inter', fontWeight: 600, fontSize: 26 }}>
                            @{username} · paperboxd.in
                        </span>
                    </div>
                </div>
            </div>
        ),
        {
            width: 1080,
            height: 1920,
            fonts: [
                { name: 'Inter', data: interSemiBold, style: 'normal', weight: 600 },
                { name: 'Inter', data: interBlack, style: 'normal', weight: 900 },
            ],
        }
    );
}
