import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
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
          backgroundColor: 'black', // Pure Black Background
          fontFamily: 'sans-serif',
        }}
      >
        {/* The White Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'white',
            borderRadius: '50px',
            width: '920px', // Fits nicely within 1080px width
            height: '600px', // Shorter height for the "Post" look, centered in black
            padding: '60px',
            boxShadow: '0 0 120px rgba(255,255,255,0.15)',
            justifyContent: 'space-between',
          }}
        >
          {/* Top Row: Username */}
          <div style={{ display: 'flex', width: '100%', opacity: 0.5, marginBottom: '20px' }}>
            <p style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: 'black' }}>
              @{username}
            </p>
          </div>

          {/* Middle Row: Content (Flex Row: Title Left, Cover Right) */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', height: '100%', gap: '40px' }}>
            
            {/* Left Side: Text */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
              <h1
                style={{
                  fontSize: '54px', // Smaller font to fit side-by-side
                  fontWeight: '900',
                  color: '#111827',
                  margin: 0,
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                  display: '-webkit-box',
                  WebkitLineClamp: 4, // Limit lines
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textAlign: 'left',
                }}
              >
                {title}
              </h1>
              <p
                style={{
                  fontSize: '36px',
                  color: '#6b7280',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: 0,
                  marginTop: '16px',
                  textAlign: 'left',
                }}
              >
                {author}
              </p>
            </div>

            {/* Right Side: Cover Image */}
            <div style={{ display: 'flex', width: '280px', flexShrink: 0, justifyContent: 'center' }}>
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  style={{
                    width: '280px',
                    height: '420px',
                    objectFit: 'cover',
                    borderRadius: '20px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                  }}
                  alt="Cover"
                />
              ) : (
                <div
                  style={{
                    width: '280px',
                    height: '420px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: '#9ca3af',
                  }}
                >
                  No Cover
                </div>
              )}
            </div>
          </div>

          {/* Footer: Branding */}
          <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-start', marginTop: '20px' }}>
            <p
              style={{
                fontSize: '24px',
                fontWeight: '900',
                color: '#d1d5db',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                margin: 0,
              }}
            >
              PAPERBOXD
            </p>
          </div>

        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920, // Keep canvas tall for Instagram Story
    }
  );
}