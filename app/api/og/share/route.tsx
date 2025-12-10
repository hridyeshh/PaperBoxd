import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get('title') || 'Book';
  const author = searchParams.get('author') || '';
  const coverUrl = searchParams.get('cover') || '';
  const username = searchParams.get('username') || '';

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
          fontFamily: 'sans-serif',
        }}
      >
        {/* White Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: 'white',
            borderRadius: '60px',
            width: '920px',
            height: '1600px', // Slightly shorter than full height to leave margins
            padding: '80px 40px',
            boxShadow: '0 0 80px rgba(255,255,255,0.1)',
          }}
        >
          {/* Username */}
          {username && (
            <div style={{ display: 'flex', width: '100%', marginBottom: '40px', opacity: 0.5 }}>
              <p style={{ fontSize: '40px', fontWeight: 'bold', margin: 0 }}>@{username}</p>
            </div>
          )}

          {/* Book Cover */}
          <div style={{ display: 'flex', marginBottom: '60px' }}>
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={title}
                width="500"
                height="750"
                style={{
                  objectFit: 'cover',
                  borderRadius: '32px',
                  boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '500px',
                  height: '750px',
                  backgroundColor: '#eee',
                  borderRadius: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                  color: '#999',
                }}
              >
                No Cover
              </div>
            )}
          </div>

          {/* Text Info */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '20px',
            }}
          >
            <h1
              style={{
                fontSize: '70px',
                fontWeight: '900',
                color: 'black',
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              {title}
            </h1>
            {author && (
              <p
                style={{
                  fontSize: '48px',
                  color: '#6b7280',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  margin: 0,
                  letterSpacing: '0.05em',
                }}
              >
                {author}
              </p>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              marginTop: 'auto',
              borderTop: '2px solid #f3f4f6',
              width: '100%',
              justifyContent: 'center',
              paddingTop: '40px',
            }}
          >
            <p
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#d1d5db',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
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
    }
  );
}
