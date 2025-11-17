"use client";
import React, { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Image from "next/image";

type Card = {
  id: number;
  content: JSX.Element | React.ReactNode | string;
  className: string;
  thumbnail: string;
  onClick?: () => void;
};

export const LayoutGrid = ({ cards }: { cards: Card[] }) => {
  const [selected, setSelected] = useState<Card | null>(null);
  const [lastSelected, setLastSelected] = useState<Card | null>(null);

  const handleClick = (card: Card) => {
    setLastSelected(selected);
    setSelected(card);
  };

  const handleCardDoubleClick = (card: Card) => {
    // Navigate on double click
    if (card.onClick) {
      card.onClick();
    }
  };

  const handleOutsideClick = () => {
    setLastSelected(selected);
    setSelected(null);
  };

  return (
    <div className="w-full p-10 grid grid-cols-1 md:grid-cols-2 max-w-7xl mx-auto gap-4 relative">
      {cards.map((card, i) => (
        <div key={i} className={cn(card.className, "min-h-[400px]")}>
          <motion.div
            onClick={() => handleClick(card)}
            onDoubleClick={() => handleCardDoubleClick(card)}
            className={cn(
              card.className,
              "relative overflow-hidden cursor-pointer",
              selected?.id === card.id
                ? "rounded-lg absolute inset-0 h-1/2 w-full md:w-1/2 m-auto z-50 flex justify-center items-center flex-wrap flex-col"
                : lastSelected?.id === card.id
                ? "z-40 bg-background rounded-xl h-full w-full min-h-[400px]"
                : "bg-background rounded-xl h-full w-full min-h-[400px]"
            )}
            layoutId={`card-${card.id}`}
          >
            {selected?.id === card.id && <SelectedCard selected={selected} card={card} />}
            <ImageComponent card={card} />
          </motion.div>
        </div>
      ))}
      <motion.div
        onClick={handleOutsideClick}
        className={cn(
          "absolute h-full w-full left-0 top-0 bg-black opacity-0 z-10",
          selected?.id ? "pointer-events-auto" : "pointer-events-none"
        )}
        animate={{ opacity: selected?.id ? 0.3 : 0 }}
      />
    </div>
  );
};

const ImageComponent = ({ card }: { card: Card }) => {
  return (
    <motion.div
      layoutId={`image-${card.id}-image`}
      className={cn(
        "absolute inset-0 h-full w-full transition duration-200"
      )}
    >
      <Image
        src={card.thumbnail}
        fill
        className="object-cover object-top"
        alt="thumbnail"
        sizes="(max-width: 768px) 100vw, 33vw"
        unoptimized={card.thumbnail?.includes('isbndb.com') || card.thumbnail?.includes('images.isbndb.com') || card.thumbnail?.includes('covers.isbndb.com') || card.thumbnail?.includes('unsplash.com')}
      />
    </motion.div>
  );
};

const SelectedCard = ({ selected, card }: { selected: Card | null; card: Card }) => {
  return (
    <div className="bg-transparent h-full w-full flex flex-col justify-end rounded-lg shadow-2xl relative z-[60]">
      <motion.div
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 0.6,
        }}
        className="absolute inset-0 h-full w-full bg-black opacity-60 z-10"
      />
      <motion.div
        layoutId={`content-${selected?.id}`}
        initial={{
          opacity: 0,
          y: 100,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        exit={{
          opacity: 0,
          y: 100,
        }}
        transition={{
          duration: 0.3,
          ease: "easeInOut",
        }}
        className="relative px-8 pb-4 z-[70]"
      >
        {selected?.content}
        {card.onClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              card.onClick?.();
            }}
            className="mt-4 px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-white/90 transition-colors"
          >
            View Details
          </button>
        )}
      </motion.div>
    </div>
  );
};
