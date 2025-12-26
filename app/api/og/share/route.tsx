import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  // 1. LOAD CUSTOM FONTS (Inter to match your app)
  const interSemiBold = await fetch(
    new URL('https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hjp-Ek-_EeA.woff', import.meta.url)
  ).then((res) => res.arrayBuffer());

  const interBlack = await fetch(
    new URL('https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuDyYAZ9hjp-Ek-_EeA.woff', import.meta.url)
  ).then((res) => res.arrayBuffer());

  const { searchParams } = request.nextUrl;
  const title = searchParams.get('title') || 'Book Title';
  const author = searchParams.get('author') || 'Unknown Author';
  const coverUrl = searchParams.get('cover'); 
  const username = searchParams.get('username') || 'Reader';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'black', // Pure black background
          padding: '64px', // p-16 equivalent
        }}
      >
        {/* White Card Container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: 'white',
            borderRadius: '50px', // rounded-[50px]
            width: '100%',
            height: '650px',      // Fixed height from your design
            padding: '48px',      // p-12
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // shadow-2xl equivalent
            overflow: 'hidden',
          }}
        >
          {/* Top: Username */}
          <div style={{ display: 'flex', width: '100%', opacity: 0.5 }}>
            <p style={{ 
              fontFamily: 'Inter', 
              fontWeight: 900, 
              fontSize: '36px', // text-4xl approx
              margin: 0, 
              color: 'black',
              letterSpacing: '-0.02em'
            }}>
              @{username}
            </p>
          </div>

          {/* Middle: Side-by-Side Content */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'row', 
            alignItems: 'center', 
            gap: '40px',
            flex: 1,
            paddingTop: '32px',
            paddingBottom: '32px',
          }}>
            
            {/* Left: Text */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <h1
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 900, // font-black
                  fontSize: '60px', // text-6xl approx
                  color: 'black',
                  margin: 0,
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                  // Simulation of line-clamp
                  display: '-webkit-box',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {title}
              </h1>
              <p
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 600, // font-semibold
                  fontSize: '36px', // text-4xl approx
                  color: '#6b7280', // text-gray-500
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: 0,
                  marginTop: '24px',
                }}
              >
                {author}
              </p>
            </div>

            {/* Right: Book Cover */}
            <div style={{ display: 'flex', flexShrink: 0 }}>
              {coverUrl ? (
                <img
                  src={coverUrl}
                  width="280"
                  height="420"
                  style={{
                    objectFit: 'cover',
                    borderRadius: '24px',
                    border: '4px solid rgba(0,0,0,0.05)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  }}
                  alt="Cover"
                />
              ) : (
                <div
                  style={{
                    width: '280px',
                    height: '420px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: '#d1d5db',
                    border: '4px solid rgba(0,0,0,0.05)',
                    fontWeight: 900,
                  }}
                >
                  NO COVER
                </div>
              )}
            </div>
          </div>

          {/* Bottom: Footer */}
          <div style={{ 
            display: 'flex', 
            width: '100%', 
            borderTop: '2px solid #f3f4f6', 
            paddingTop: '32px',
            marginTop: '8px'
          }}>
            <p
              style={{
                fontFamily: 'Inter',
                fontWeight: 900, // font-black
                fontSize: '30px', // text-3xl approx
                color: '#d1d5db', // text-gray-300
                letterSpacing: '0.25em',
                textTransform: 'lowercase',
                margin: 0,
              }}
            >
              paperboxd.in
            </p>
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