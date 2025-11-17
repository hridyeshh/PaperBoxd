"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export interface BookCarouselBook {
  id: string;
  title: string;
  author: string;
  cover: string;
}

interface BookCardProps {
  book: BookCarouselBook;
}

function BookCard({ book }: BookCardProps) {
  const router = useRouter();

  return (
    <div
      className="group flex w-[180px] flex-shrink-0 flex-col gap-3 cursor-pointer"
      onClick={() => router.push(`/b/${book.id}`)}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-3xl bg-muted shadow-sm">
        <Image
          src={book.cover || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80"}
          alt={`${book.title} cover`}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="180px"
          quality={100}
          unoptimized={
            book.cover?.includes('isbndb.com') ||
            book.cover?.includes('images.isbndb.com') ||
            book.cover?.includes('covers.isbndb.com') ||
            true
          }
        />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground line-clamp-2">{book.title}</h3>
        <p className="text-sm text-muted-foreground truncate">{book.author}</p>
      </div>
    </div>
  );
}

interface BookCarouselProps {
  title: string;
  subtitle: string;
  books: BookCarouselBook[];
}

export function BookCarousel({ title, subtitle, books }: BookCarouselProps) {
  if (books.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </section>
  );
}

