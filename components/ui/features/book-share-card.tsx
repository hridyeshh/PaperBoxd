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
  const [imageError, setImageError] = React.useState(false);

  // Use the proxy URL if a cover exists
  const proxyUrl = coverUrl 
    ? `/api/image-proxy?url=${encodeURIComponent(coverUrl)}`
    : null;

  return (
    <div
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

        {/* Main content area */}
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
            {proxyUrl && !imageError ? (
              <div className="relative aspect-[2/3] w-[520px] overflow-hidden rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] bg-muted">
                {/* CRITICAL: 
                    1. Use standard <img> for html-to-image compatibility
                    2. crossOrigin="anonymous" allows pixel reading
                    3. src is the PROXY URL, not the original google/amazon url
                */}
                <img
                  src={proxyUrl}
                  alt={title}
                  crossOrigin="anonymous"
                  className="w-full h-full object-cover"
                  style={{ display: 'block' }}
                  onError={() => setImageError(true)}
                />
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
