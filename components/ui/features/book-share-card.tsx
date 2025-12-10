"use client";

import * as React from "react";

export interface BookShareCardProps {
  title: string;
  author?: string;
  coverUrl?: string;
  username?: string;
}

export function BookShareCard({
  title,
  author,
  coverUrl,
  username,
}: BookShareCardProps) {
  const [base64Cover, setBase64Cover] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch the Base64 string when the component mounts
  React.useEffect(() => {
    if (!coverUrl) {
      setIsLoading(false);
      return;
    }

    // If it's already a data URL (pre-fetched), use it directly
    if (coverUrl.startsWith('data:')) {
      setBase64Cover(coverUrl);
      setIsLoading(false);
      return;
    }

    const fetchBase64 = async () => {
      try {
        setIsLoading(true);
        // Call our proxy endpoint
        const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(coverUrl)}`);
        if (!res.ok) throw new Error("Failed to fetch proxy");
        
        // The response body IS the base64 string
        const dataUrl = await res.text();
        setBase64Cover(dataUrl);
      } catch (e) {
        console.error("Failed to load cover via proxy", e);
        // Fallback to original URL (might fail CORS, but better than nothing)
        setBase64Cover(coverUrl);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBase64();
  }, [coverUrl]);

  return (
    <div
      // Landscape dimensions with pure black background
      className="relative w-[1600px] h-[1200px] bg-black flex items-center justify-center p-20"
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      {/* White card with rounded corners and subtle shadow */}
      <div className="relative w-full h-full bg-white rounded-[80px] shadow-[0_0_80px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
        {/* Username on top */}
        {username && (
          <div className="absolute top-10 left-10 z-10">
            <p className="text-4xl font-bold text-black tracking-tight">@{username}</p>
          </div>
        )}

        {/* Main content area - Landscape layout */}
        <div className="flex-1 flex items-center justify-between px-20 py-16">
          {/* Left side: Book title and author */}
          <div className="flex-1 flex flex-col justify-center space-y-8 pr-16">
            <h1 className="text-8xl font-bold text-black leading-[1.1] tracking-tight">
              {title}
            </h1>
            {author && (
              <p className="text-5xl text-gray-600 font-semibold">{author}</p>
            )}
          </div>

          {/* Right side: Book cover with elegant shadow */}
          <div className="flex-shrink-0">
            {base64Cover && !isLoading ? (
              <div className="relative aspect-[2/3] w-[520px] overflow-hidden rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] bg-muted">
                {/* CRITICAL: 
                    1. Use standard <img> tag for html-to-image compatibility
                    2. No crossOrigin needed for Data URLs!
                    3. src is now a Base64 data URL string
                */}
                <img
                  src={base64Cover} // Now this is a huge "data:image/jpg;base64..." string
                  alt={title}
                  className="w-full h-full object-cover"
                  style={{ display: 'block' }}
                />
              </div>
            ) : isLoading ? (
              <div className="relative aspect-[2/3] w-[520px] bg-gray-200 flex items-center justify-center rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                <span className="text-gray-400 text-3xl font-medium">Loading...</span>
              </div>
            ) : (
              <div className="relative aspect-[2/3] w-[520px] bg-gray-200 flex items-center justify-center rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
                <span className="text-gray-400 text-3xl font-medium">No cover</span>
              </div>
            )}
          </div>
        </div>

        {/* Paperboxd branding - right bottom */}
        <div className="absolute bottom-10 right-10">
          <p className="text-3xl font-semibold text-gray-500 tracking-wide">paperboxd.in</p>
        </div>
      </div>
    </div>
  );
}
