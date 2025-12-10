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
  return (
    <div
      className="relative w-[1080px] h-[1920px] bg-black flex items-center justify-center p-20"
      style={{ fontFamily: "sans-serif" }} // Safe fallback font
    >
      {/* White Card */}
      <div className="relative w-[920px] bg-white rounded-[60px] shadow-[0_0_80px_rgba(255,255,255,0.1)] overflow-hidden flex flex-col items-center py-24 px-12 gap-12">

        {/* Username */}
        {username && (
          <div className="w-full flex justify-start opacity-50 mb-4">
            <p className="text-4xl font-bold text-black tracking-tight">@{username}</p>
          </div>
        )}

        {/* Book Cover */}
        <div className="relative w-[500px] aspect-[2/3] rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.2)] overflow-hidden bg-gray-100">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={title}
              className="w-full h-full object-cover"
              style={{ display: 'block' }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-3xl font-medium">
              No Cover
            </div>
          )}
        </div>

        {/* Text Info */}
        <div className="flex flex-col items-center text-center space-y-6 max-w-[800px]">
          <h1 className="text-7xl font-bold text-black leading-[1.1] tracking-tight line-clamp-3">
            {title}
          </h1>
          {author && (
            <p className="text-5xl text-gray-500 font-semibold uppercase tracking-widest">
              {author}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-10 border-t border-gray-100 w-full text-center opacity-30">
          <p className="text-3xl font-bold text-black tracking-[0.3em] text-bold">
            paperboxd.in
          </p>
        </div>

      </div>
    </div>
  );
}
