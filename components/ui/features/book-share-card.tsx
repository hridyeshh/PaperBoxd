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
      style={{ fontFamily: "sans-serif" }}
    >
      {/* White Card - Smaller with more black margins, landscape layout */}
      <div className="relative w-[780px] h-[850px] bg-white rounded-[60px] shadow-[0_0_80px_rgba(255,255,255,0.1)] overflow-hidden flex flex-row items-center px-10 py-12 gap-10">
        
        {/* Username - Top Left */}
        {username && (
          <div className="absolute top-10 left-10">
            <p className="text-[28px] font-bold text-black">@{username}</p>
          </div>
        )}

        {/* Left Side: Text Content */}
        <div className="flex-1 flex flex-col justify-center h-full pt-10">
          <div className="flex flex-col gap-5">
            <h1 className="text-[52px] font-black text-black leading-[1.1]">
              {title}
            </h1>
            {author && (
              <p className="text-[32px] text-gray-600 font-semibold">
                {author}
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Book Cover */}
        <div className="flex-shrink-0">
          {coverUrl ? (
            <div className="relative w-[350px] h-[525px] overflow-hidden rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.3)] bg-gray-100">
              <img
                src={coverUrl}
                alt={title}
                className="w-full h-full object-cover"
                style={{ display: 'block' }}
              />
            </div>
          ) : (
            <div className="relative w-[350px] h-[525px] bg-gray-200 flex items-center justify-center rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.3)]">
              <span className="text-gray-400 text-[28px] font-medium">No Cover</span>
            </div>
          )}
        </div>

        {/* Footer - Bottom Right */}
        <div className="absolute bottom-10 right-10">
          <p className="text-[22px] font-semibold text-gray-400">
            paperboxd.in
          </p>
        </div>

      </div>
    </div>
  );
}
