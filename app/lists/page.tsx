"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/layout/header-with-search";
import { DesktopSidebar } from "@/components/ui/layout/desktop-sidebar";
import { MinimalDesktopHeader } from "@/components/ui/layout/minimal-desktop-header";
import TetrisLoading from "@/components/ui/features/tetris-loader";
import { AnimatedGridPattern } from "@/components/ui/shared/animated-grid-pattern";
import { useIsMobile } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { BookOpen, Lock, Globe } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface BookCover {
  id?: string;
  _id?: string;
  cover?: string;
  thumbnail?: string;
  volumeInfo?: {
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
      extraLarge?: string;
    };
  };
}

interface ReadingList {
  id: string;
  title: string;
  description?: string;
  booksCount: number;
  books: BookCover[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ListsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [lists, setLists] = useState<ReadingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (!session?.user) {
      router.push("/auth");
      return;
    }

    const fetchLists = async () => {
      if (!session?.user?.username) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/users/${encodeURIComponent(session.user.username)}/lists`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch lists");
        }

        const data = await response.json();
        setLists(data.lists || []);
      } catch (err) {
        console.error("Error fetching lists:", err);
        setError(err instanceof Error ? err.message : "Failed to load lists");
      } finally {
        setLoading(false);
      }
    };

    fetchLists();
  }, [session?.user, status, router]);

  // Show loading state
  if (status === "loading" || loading) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-background">
        <AnimatedGridPattern
          numSquares={120}
          maxOpacity={0.08}
          duration={4}
          repeatDelay={0.75}
          className="text-slate-500 dark:text-slate-400"
        />
        <div className="relative z-10 flex min-h-screen flex-col">
          {isMobile ? (
            <Header minimalMobile={isMobile} />
          ) : (
            <>
              <DesktopSidebar />
              <MinimalDesktopHeader />
            </>
          )}
          <div className={cn(
            "flex flex-1 items-center justify-center px-4 pb-16 pt-20 md:pb-24 md:pt-24",
            isMobile ? "mt-16" : "mt-16 ml-16"
          )}>
            <TetrisLoading size="md" speed="fast" loadingText="Loading lists..." />
          </div>
        </div>
      </main>
    );
  }

  // Redirect if not authenticated
  if (!session?.user) {
    return null;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <AnimatedGridPattern
        numSquares={120}
        maxOpacity={0.08}
        duration={4}
        repeatDelay={0.75}
        className="text-slate-500 dark:text-slate-400"
      />
      <div className="relative z-10 flex min-h-screen flex-col">
        {isMobile ? (
          <Header minimalMobile={isMobile} />
        ) : (
          <>
            <DesktopSidebar />
            <MinimalDesktopHeader />
          </>
        )}
        <div className={cn(
          "flex-1",
          isMobile ? "mt-16" : "mt-16 ml-16"
        )}>
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 pb-24 md:pb-8">
            <div className="space-y-8">
              {/* Header */}
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  Your lists
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Organize your reading with curated collections of books you love, want to read, or want to share.
                </p>
              </div>

              {/* Error State */}
              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Lists Grid */}
              {lists.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No lists yet</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Start organizing your reading by creating your first list. You can add books, share with friends, and keep track of what you want to read.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {lists.map((list) => (
                    <Link
                      key={list.id}
                      href={`/u/${session?.user?.username}/lists/${list.id}`}
                      className="group relative rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-6 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                    >
                      {/* Book Covers */}
                      {list.books && list.books.length > 0 && (
                        <div className="flex gap-2 mb-4 -ml-1">
                          {list.books.slice(0, 3).map((book, index) => {
                            const imageLinks = book.volumeInfo?.imageLinks;
                            const coverUrl = book.cover || book.thumbnail || 
                              imageLinks?.large ||
                              imageLinks?.medium ||
                              imageLinks?.thumbnail ||
                              imageLinks?.smallThumbnail ||
                              imageLinks?.small ||
                              imageLinks?.extraLarge ||
                              '/user-placeholder.png';
                            
                            const bookId = book.id || book._id || `book-${index}`;
                            
                            return (
                              <div
                                key={bookId}
                                className="relative w-12 h-16 rounded overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 flex-shrink-0"
                                style={{ zIndex: 3 - index }}
                              >
                                <Image
                                  src={coverUrl}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="48px"
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {list.title}
                          </h3>
                        </div>
                        <div className="flex-shrink-0 ml-2" title={list.isPublic ? "Public" : "Private"}>
                          {list.isPublic ? (
                            <Globe className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      
                      {list.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {list.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        <span>{list.booksCount} {list.booksCount === 1 ? 'book' : 'books'}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </main>
  );
}

