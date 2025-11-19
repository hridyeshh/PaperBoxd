"use client";

import {
  useScroll,
  useTransform,
  motion,
} from "framer-motion";
import React, { useEffect, useRef, useState } from "react";

interface TimelineEntry {
  title: string;
  content: React.ReactNode;
}

export const Timeline = ({ data }: { data: TimelineEntry[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [itemOffsets, setItemOffsets] = useState<number[]>([]);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHeight(rect.height);

      // Calculate offset for each timeline item
      const items = ref.current.querySelectorAll('.timeline-item');
      const offsets = Array.from(items).map((item) => {
        const itemRect = item.getBoundingClientRect();
        const containerRect = ref.current!.getBoundingClientRect();
        return itemRect.top - containerRect.top;
      });
      setItemOffsets(offsets);
    }
  }, [ref, data]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div
      className="w-full bg-background font-sans md:px-10"
      ref={containerRef}
    >
      <div className="max-w-7xl mx-auto py-20 px-4 md:px-8 lg:px-10">
        <h2 className="text-3xl md:text-6xl lg:text-7xl mb-4 text-foreground max-w-4xl" style={{ fontFamily: '"fabulosa", serif' }}>
          What is PaperBoxd?
        </h2>
        <p className="text-muted-foreground text-base md:text-lg lg:text-xl max-w-sm">
          Your reading universe, organized.
        </p>
      </div>

      <div ref={ref} className="relative max-w-7xl mx-auto pb-20 px-4 md:px-8">
        {/* Timeline Line - Centered vertical line */}
        <div
          style={{
            height: height + "px",
          }}
          className="hidden md:block absolute left-1/2 top-0 -translate-x-1/2 overflow-hidden w-[2px] bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-[0%] via-border to-transparent to-[99%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)] z-0"
        >
          {/* Animated beam */}
          <motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
            className="absolute inset-x-0 top-0 w-[2px] bg-gradient-to-t from-primary via-primary/50 to-transparent from-[0%] via-[10%] rounded-full"
          />
          {/* Glowing tip of the beam */}
          <motion.div
            style={{
              top: heightTransform,
              opacity: opacityTransform,
            }}
            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3"
          >
            {/* Outer glow */}
            <div className="absolute inset-0 rounded-full bg-primary blur-md opacity-60 animate-pulse" />
            {/* Middle glow */}
            <div className="absolute inset-0 rounded-full bg-primary blur-sm opacity-80" />
            {/* Core */}
            <div className="absolute inset-0 rounded-full bg-primary" />
          </motion.div>
        </div>

        {/* Timeline Line - Mobile */}
        <div
          style={{
            height: height + "px",
          }}
          className="md:hidden absolute left-8 top-0 overflow-hidden w-[2px] bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-[0%] via-border to-transparent to-[99%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)] z-0"
        >
          {/* Animated beam */}
          <motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
            className="absolute inset-x-0 top-0 w-[2px] bg-gradient-to-t from-primary via-primary/50 to-transparent from-[0%] via-[10%] rounded-full"
          />
          {/* Glowing tip of the beam */}
          <motion.div
            style={{
              top: heightTransform,
              opacity: opacityTransform,
            }}
            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3"
          >
            <div className="absolute inset-0 rounded-full bg-primary blur-md opacity-60 animate-pulse" />
            <div className="absolute inset-0 rounded-full bg-primary blur-sm opacity-80" />
            <div className="absolute inset-0 rounded-full bg-primary" />
          </motion.div>
        </div>

        {/* Timeline Items - Alternating layout */}
        {data.map((item, index) => {
          const isEven = index % 2 === 0;
          // Even indices: timeline on left, content on left (both in left half)
          // Odd indices: timeline on right, content on left (timeline right half, content left half)

          // Calculate if beam has reached this dot
          // Only start animation when beam touches the dot (at dotOffset)
          const dotOffset = itemOffsets[index] || 0;
          const beamProgress = useTransform(
            heightTransform,
            [dotOffset, dotOffset + 40],
            [0, 1]
          );

          return (
            <div
              key={index}
              className="timeline-item relative pt-10 md:pt-20 first:pt-0"
            >
              {/* Animated Dot - Desktop */}
              <motion.div
                className={`hidden md:flex absolute left-1/2 h-10 w-10 rounded-full bg-background items-center justify-center z-10 ${index === 0 ? 'top-0' : 'top-20'}`}
                style={{
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {/* Outer glow ring - animates when beam reaches */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/20"
                  style={{
                    scale: useTransform(beamProgress, [0, 1], [1, 1.5]),
                    opacity: useTransform(beamProgress, [0, 0.5, 1], [0, 0.8, 0]),
                  }}
                />
                {/* Inner dot - changes color when beam reaches */}
                <motion.div
                  className="h-4 w-4 rounded-full border-2 relative bg-muted border-border"
                  style={{
                    scale: useTransform(beamProgress, [0, 1], [1, 1.1]),
                  }}
                >
                  {/* Color overlay that fades in */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary"
                    style={{
                      opacity: useTransform(beamProgress, [0, 1], [0, 1]),
                    }}
                  />
                  {/* Pulsing glow when active */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary blur-sm"
                    style={{
                      scale: useTransform(beamProgress, [0, 0.5, 1], [0.8, 1.2, 1]),
                      opacity: useTransform(beamProgress, [0, 0.5, 1], [0, 0.8, 0.6]),
                    }}
                  />
                </motion.div>
              </motion.div>

              {/* Animated Dot - Mobile */}
              <motion.div
                className={`md:hidden flex absolute left-8 h-10 w-10 rounded-full bg-background items-center justify-center z-10 ${index === 0 ? 'top-0' : 'top-10'}`}
                style={{ transform: 'translate(-50%, -50%)' }}
              >
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/20"
                  style={{
                    scale: useTransform(beamProgress, [0, 1], [1, 1.5]),
                    opacity: useTransform(beamProgress, [0, 0.5, 1], [0, 0.8, 0]),
                  }}
                />
                <motion.div
                  className="h-4 w-4 rounded-full border-2 relative bg-muted border-border"
                  style={{
                    scale: useTransform(beamProgress, [0, 1], [1, 1.1]),
                  }}
                >
                  {/* Color overlay that fades in */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary"
                    style={{
                      opacity: useTransform(beamProgress, [0, 1], [0, 1]),
                    }}
                  />
                  {/* Pulsing glow when active */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary blur-sm"
                    style={{
                      scale: useTransform(beamProgress, [0, 0.5, 1], [0.8, 1.2, 1]),
                      opacity: useTransform(beamProgress, [0, 0.5, 1], [0, 0.8, 0.6]),
                    }}
                  />
                </motion.div>
              </motion.div>

              {isEven ? (
                // Even: Timeline and content both on left side
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
                  <motion.div
                    className="hidden md:block relative"
                    style={{
                      opacity: useTransform(beamProgress, [0, 0.5], [0.5, 1]),
                    }}
                  >
                    <div className="flex items-center">
                      <motion.h3
                        className="pl-0 pr-4 text-2xl md:text-4xl lg:text-5xl font-bold text-muted-foreground text-right w-full"
                        style={{
                          filter: useTransform(beamProgress, [0, 1], ['brightness(0.8)', 'brightness(1.2)']),
                        }}
                      >
                        {item.title}
                      </motion.h3>
                    </div>
                  </motion.div>
                  <motion.div
                    className="relative"
                    style={{
                      opacity: useTransform(beamProgress, [0, 0.5], [0.6, 1]),
                    }}
                  >
                    <motion.h3
                      className="md:hidden block text-2xl mb-6 text-left font-bold text-muted-foreground"
                      style={{
                        filter: useTransform(beamProgress, [0, 1], ['brightness(0.8)', 'brightness(1.2)']),
                      }}
                    >
                      {item.title}
                    </motion.h3>
                    {/* Card with gradient behind */}
                    <div className="relative rounded-lg p-6 md:p-8">
                      {/* Gradient background element */}
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary/30 via-primary/20 to-primary/5 -z-10" />
                      {/* Card content */}
                      <div className="relative bg-background/90 backdrop-blur-sm rounded-lg border border-border/50 p-6 md:p-8 -m-6 md:-m-8">
                        {item.content}
                      </div>
                    </div>
                  </motion.div>
                  <div className="hidden md:block" /> {/* Spacer */}
                </div>
              ) : (
                // Odd: Timeline on right, content on left
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
                  <motion.div
                    className="relative"
                    style={{
                      opacity: useTransform(beamProgress, [0, 0.5], [0.6, 1]),
                    }}
                  >
                    <motion.h3
                      className="md:hidden block text-2xl mb-6 text-left font-bold text-muted-foreground"
                      style={{
                        filter: useTransform(beamProgress, [0, 1], ['brightness(0.8)', 'brightness(1.2)']),
                      }}
                    >
                      {item.title}
                    </motion.h3>
                    {/* Card with gradient behind */}
                    <div className="relative rounded-lg p-6 md:p-8">
                      {/* Gradient background element */}
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary/30 via-primary/20 to-primary/5 -z-10" />
                      {/* Card content */}
                      <div className="relative bg-background/90 backdrop-blur-sm rounded-lg border border-border/50 p-6 md:p-8 -m-6 md:-m-8">
                        {item.content}
                      </div>
                    </div>
                  </motion.div>
                  <motion.div
                    className="hidden md:block relative order-2"
                    style={{
                      opacity: useTransform(beamProgress, [0, 0.5], [0.5, 1]),
                    }}
                  >
                    <div className="flex items-center justify-end">
                      <motion.h3
                        className="pl-4 pr-0 text-2xl md:text-4xl lg:text-5xl font-bold text-muted-foreground text-left w-full"
                        style={{
                          filter: useTransform(beamProgress, [0, 1], ['brightness(0.8)', 'brightness(1.2)']),
                        }}
                      >
                        {item.title}
                      </motion.h3>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
