"use client";

import * as React from "react";

export interface BookShareCardProps {
  title: string;
  author?: string;
  coverUrl?: string;
  rating?: number;
  pageCount?: number;
  variant?: "aura" | "critic" | "polaroid";
}

export function BookShareCard({
  title,
  author,
  coverUrl,
  rating,
  pageCount,
  variant = "aura",
}: BookShareCardProps) {
  const [imageError, setImageError] = React.useState(false);

  // Format rating to stars (e.g., 4.5 -> "★★★★½")
  const formatRating = (rating?: number): string => {
    if (!rating) return "";
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    return "★".repeat(fullStars) + (hasHalf ? "½" : "") + "☆".repeat(emptyStars);
  };

  // Aura variant - Spotify style with demo page layout
  if (variant === "aura") {
    return (
      <div
        className="relative w-[1080px] h-[1920px] bg-gradient-to-b from-zinc-900 via-zinc-950 to-black overflow-hidden"
        style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
      >
        {/* Blurry background cover */}
        {coverUrl && !imageError && (
          <div className="absolute inset-0 opacity-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl}
              alt=""
              crossOrigin="anonymous"
              className="w-full h-full object-cover blur-[120px] scale-150"
              onError={() => setImageError(true)}
            />
          </div>
        )}

        {/* Content - Demo page style layout */}
        <div className="relative z-10 h-full flex flex-col lg:flex-row gap-12 lg:gap-16 items-center justify-center px-16 py-20">
          {/* Left: Book Cover */}
          <div className="flex-shrink-0">
            {coverUrl && !imageError ? (
              <div className="relative aspect-[2/3] w-[400px] overflow-hidden rounded-2xl shadow-2xl bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverUrl}
                  alt={title}
                  crossOrigin="anonymous"
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              </div>
            ) : (
              <div className="relative aspect-[2/3] w-[400px] bg-muted flex items-center justify-center rounded-2xl shadow-2xl">
                <span className="text-muted-foreground text-xl">No cover</span>
              </div>
            )}
          </div>

          {/* Right: Book Details */}
          <div className="flex-1 space-y-8 min-w-0 text-center lg:text-left">
            {/* Book Title */}
            <h1 className="text-6xl lg:text-7xl font-bold tracking-tight text-white leading-tight">
              {title}
            </h1>

            {/* Author */}
            {author && (
              <p className="text-3xl lg:text-4xl text-zinc-300 font-light">
                by {author}
              </p>
            )}

            {/* Rating */}
            {rating !== undefined && (
              <div className="pt-4">
                <div className="text-4xl text-white font-semibold mb-1">
                  {rating.toFixed(1)}
                </div>
                <div className="text-xl text-zinc-400">out of 5</div>
              </div>
            )}

            {/* Page count */}
            {pageCount && (
              <div className="pt-4">
                <div className="text-2xl text-zinc-400 font-light">
                  {pageCount} pages
                </div>
              </div>
            )}

            {/* Paperboxd branding - bottom */}
            <div className="pt-8 mt-auto">
              <p className="text-2xl text-zinc-500 font-light">
                on paperboxd.in
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Critic variant - Letterboxd style with demo page layout
  if (variant === "critic") {
    const starRating = formatRating(rating);
    return (
      <div
        className="relative w-[1080px] h-[1920px] bg-zinc-950 flex flex-col lg:flex-row gap-12 lg:gap-16 items-center justify-center px-16 py-20"
        style={{ fontFamily: "ui-monospace, 'Courier New', monospace" }}
      >
        {/* Left: Cover image */}
        <div className="flex-shrink-0">
          {coverUrl && !imageError ? (
            <div className="relative aspect-[2/3] w-[350px] overflow-hidden rounded-2xl shadow-2xl bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                alt={title}
                crossOrigin="anonymous"
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            <div className="relative aspect-[2/3] w-[350px] bg-muted flex items-center justify-center rounded-2xl shadow-2xl">
              <span className="text-zinc-500 text-lg font-mono">No cover</span>
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div className="flex-1 space-y-8 min-w-0 text-center lg:text-left">
          {/* Star rating - hero element */}
          {rating !== undefined && (
            <div className="mb-8">
              <div className="text-[100px] lg:text-[120px] text-green-400 font-bold leading-none mb-4">
                {starRating}
              </div>
              {rating && (
                <div className="text-3xl text-zinc-400 font-mono">
                  {rating.toFixed(1)} / 5.0
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            {title}
          </h1>

          {/* Author */}
          {author && (
            <p className="text-2xl lg:text-3xl text-zinc-400 font-mono">
              by {author}
            </p>
          )}

          {/* Page count */}
          {pageCount && (
            <div className="pt-4">
              <div className="text-xl text-zinc-500 font-mono">
                {pageCount} pages
              </div>
            </div>
          )}

          {/* Paperboxd branding */}
          <div className="pt-8 mt-auto">
            <div className="text-lg text-zinc-600 font-mono">
              on paperboxd.in
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Polaroid variant - Cozy style with demo page layout
  return (
    <div
      className="relative w-[1080px] h-[1920px] bg-[#f5f1e8] flex flex-col lg:flex-row gap-12 lg:gap-16 items-center justify-center px-16 py-20"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4c4a8' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        fontFamily: "'Brush Script MT', 'Lucida Handwriting', 'Comic Sans MS', cursive, serif",
      }}
    >
      {/* Left: Polaroid frame with cover */}
      <div className="flex-shrink-0">
        <div className="relative transform -rotate-3 shadow-2xl">
          <div className="bg-white p-6 rounded-sm">
            {/* Cover image inside polaroid */}
            {coverUrl && !imageError ? (
              <div className="relative aspect-[2/3] w-[350px] mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverUrl}
                  alt={title}
                  crossOrigin="anonymous"
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              </div>
            ) : (
              <div className="relative aspect-[2/3] w-[350px] mb-4 bg-zinc-200 flex items-center justify-center">
                <span className="text-zinc-400 text-lg">No cover</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Details */}
      <div className="flex-1 space-y-6 min-w-0 text-center lg:text-left">
        {/* Title - handwriting style */}
        <h1 className="text-5xl lg:text-6xl font-bold text-zinc-800 leading-tight">
          {title}
        </h1>

        {/* Author */}
        {author && (
          <p className="text-3xl lg:text-4xl text-zinc-600">
            by {author}
          </p>
        )}

        {/* Rating */}
        {rating !== undefined && (
          <div className="pt-4">
            <div className="text-4xl text-zinc-700">
              {formatRating(rating)}
            </div>
          </div>
        )}

        {/* Page count */}
        {pageCount && (
          <div className="pt-4">
            <div className="text-2xl text-zinc-700 font-semibold">
              {pageCount} pages
            </div>
          </div>
        )}

        {/* Paperboxd branding */}
        <div className="pt-8 mt-auto">
          <div className="text-2xl text-zinc-600 font-semibold">
            on paperboxd.in
          </div>
        </div>
      </div>
    </div>
  );
}
