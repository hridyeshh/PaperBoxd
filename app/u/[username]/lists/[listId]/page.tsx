"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Share2, MoreVertical, Link2, Search, Send, Bookmark, X, Edit, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import TetrisLoading from "@/components/ui/tetris-loader";
import { NotFoundPage } from "@/components/ui/not-found-page";
import { Header } from "@/components/ui/layout/header-with-search";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dropdown } from "@/components/ui/dropdown";
import { createBookSlug } from "@/lib/utils/book-slug";

interface Book {
  _id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
      medium?: string;
      large?: string;
    };
  };
}

interface ReadingList {
  id: string;
  title: string;
  description?: string;
  books: Book[];
  booksCount: number;
  isPublic: boolean;
  allowedUsers?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const username = params?.username as string;
  const listId = params?.listId as string;

  const [list, setList] = React.useState<ReadingList | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isPrivateList, setIsPrivateList] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isAddingBook, setIsAddingBook] = React.useState(false);
  const [isShareOpen, setIsShareOpen] = React.useState(false);
  const [following, setFollowing] = React.useState<any[]>([]);
  const [isLoadingFollowing, setIsLoadingFollowing] = React.useState(false);
  const [shareSearchQuery, setShareSearchQuery] = React.useState("");
  const [allowedUsers, setAllowedUsers] = React.useState<any[]>([]);
  const [isLoadingAllowedUsers, setIsLoadingAllowedUsers] = React.useState(false);
  const [isGrantingAccess, setIsGrantingAccess] = React.useState(false);
  const [isSavingList, setIsSavingList] = React.useState(false);
  const [isListSaved, setIsListSaved] = React.useState(false);
  const [savedListId, setSavedListId] = React.useState<string | null>(null);
  const [isRemovingList, setIsRemovingList] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [editListName, setEditListName] = React.useState("");
  const [editIsSecret, setEditIsSecret] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const isOwnList = session?.user?.username === username;
  const isSharedList = !isOwnList && session?.user?.username; // Viewing someone else's list while logged in
  
  // Check if this is a saved list (has "from @" in description)
  const isSavedList = React.useMemo(() => {
    if (!list?.description) return false;
    return list.description.includes("from @");
  }, [list?.description]);
  
  // Extract creator username from description if it's a saved list
  const creatorUsername = React.useMemo(() => {
    if (!isSavedList || !list?.description) return null;
    const match = list.description.match(/from @(\w+)/);
    return match ? match[1] : null;
  }, [isSavedList, list?.description]);
  
  // User can only edit if it's their own list AND it's not a saved list
  const canEdit = isOwnList && !isSavedList;

  // Populate edit form when list loads
  React.useEffect(() => {
    if (list) {
      setEditListName(list.title);
      setEditIsSecret(!list.isPublic);
    }
  }, [list]);

  const handleEditList = async () => {
    if (!list || !username || !listId || !editListName.trim() || isUpdating) return;

    try {
      setIsUpdating(true);
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/lists/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editListName.trim(),
          isPublic: !editIsSecret,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setList(data.list);
        setIsEditDialogOpen(false);
        toast.success("List updated successfully!");
      } else {
        const error = await response.json().catch(() => ({}));
        toast.error(error.error || "Failed to update list");
      }
    } catch (err) {
      console.error("Error updating list:", err);
      toast.error("Failed to update list");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteList = async () => {
    if (!list || !username || !listId || isDeleting) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/lists/${listId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("List deleted successfully!");
        router.push(`/u/${username}`);
      } else {
        const error = await response.json().catch(() => ({}));
        toast.error(error.error || "Failed to delete list");
      }
    } catch (err) {
      console.error("Error deleting list:", err);
      toast.error("Failed to delete list");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  // Fetch list data
  React.useEffect(() => {
    if (!username || !listId) return;

    let isMounted = true;

    const fetchList = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/users/${encodeURIComponent(username)}/lists/${listId}`);

        if (!isMounted) return;

        if (!response.ok) {
          if (response.status === 404) {
            setError("List not found");
            setIsPrivateList(false);
          } else if (response.status === 403) {
            const errorData = await response.json().catch(() => ({}));
            if (errorData.isPrivate) {
              setIsPrivateList(true);
              setError(null); // Don't show error, show private message instead
            } else {
              setError(errorData.error || "Access denied");
              setIsPrivateList(false);
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            setError(errorData.error || "Failed to load list");
            setIsPrivateList(false);
          }
          setLoading(false);
          return;
        }

        const data = await response.json().catch(() => ({}));
        if (!isMounted) return;
        
        if (data.list) {
          setList(data.list);
          setIsPrivateList(false);
        } else {
          setError("Invalid response from server");
          setIsPrivateList(false);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Error fetching list:", err);
        setError("Failed to load list");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchList().catch((err) => {
      console.error("Unhandled error in fetchList:", err);
      if (isMounted) {
        setError("Failed to load list");
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [username, listId]);

  // Check if current user has saved this list
  React.useEffect(() => {
    const sessionUsername = session?.user?.username;
    const listId = list?.id;
    const listTitle = list?.title;
    const listDescription = list?.description;

    if (!sessionUsername || !listId || !listTitle) {
      setIsListSaved(false);
      setSavedListId(null);
      return;
    }

    const currentIsOwnList = sessionUsername === username;
    const currentIsSavedList = listDescription?.includes("from @") || false;

    // If viewing own list that you saved from someone else, it's already saved
    if (currentIsOwnList && currentIsSavedList) {
      setIsListSaved(true);
      setSavedListId(listId);
      return;
    }

    // If viewing your own list that you created (not saved), it's not saved
    if (currentIsOwnList && !currentIsSavedList) {
      setIsListSaved(false);
      setSavedListId(null);
      return;
    }

    // If viewing someone else's list, check if it's saved
    const currentIsSharedList = !currentIsOwnList && sessionUsername;
    if (!currentIsSharedList) {
      setIsListSaved(false);
      setSavedListId(null);
      return;
    }

    let isMounted = true;

    const checkIfSaved = async () => {
      try {
        const response = await fetch(`/api/users/${encodeURIComponent(sessionUsername)}/lists`);
        if (!isMounted) return;

        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          if (!isMounted || !data.lists) {
            if (isMounted) {
              setIsListSaved(false);
              setSavedListId(null);
            }
            return;
          }

          // Find if user has a saved list with matching title and "from @username" in description
          const savedList = data.lists.find((l: any) => 
            l.title === listTitle && 
            l.description?.includes(`from @${username}`)
          );

          if (savedList) {
            setIsListSaved(true);
            setSavedListId(savedList.id);
          } else {
            setIsListSaved(false);
            setSavedListId(null);
          }
        } else {
          if (isMounted) {
            setIsListSaved(false);
            setSavedListId(null);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Error checking if list is saved:", err);
        setIsListSaved(false);
        setSavedListId(null);
      }
    };

    checkIfSaved().catch((err) => {
      console.error("Unhandled error in checkIfSaved:", err);
      setIsListSaved(false);
      setSavedListId(null);
    });

    return () => {
      isMounted = false;
    };
  }, [session?.user?.username, list?.id, list?.title, list?.description, username]);


  // Debounced book search
  React.useEffect(() => {
    if (!searchQuery.trim() || !isSearchOpen) {
      setSearchResults([]);
      return;
    }

    let isMounted = true;

    const timeoutId = setTimeout(async () => {
      try {
        setIsSearching(true);
        const response = await fetch(
          `/api/books/search?q=${encodeURIComponent(searchQuery)}&maxResults=10&forceFresh=true`
        );

        if (!isMounted) return;

        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          // Handle both Google Books format (data.items) and database format (data.books)
          const books = Array.isArray(data.items) ? data.items : (Array.isArray(data.books) ? data.books : []);
          if (isMounted) {
            setSearchResults(books);
          }
        } else {
          if (isMounted) {
            setSearchResults([]);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Error searching books:", err);
        setSearchResults([]);
      } finally {
        if (isMounted) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [searchQuery, isSearchOpen]);

  const handleAddBook = async (book: any) => {
    if (!list || !username || !listId || isAddingBook || !canEdit) return;

    try {
      setIsAddingBook(true);

      // Determine book ID and type
      // Check if it's a MongoDB ObjectId (from database)
      const mongoId = book._id || (book.id && /^[0-9a-fA-F]{24}$/.test(book.id) ? book.id : null);
      
      // Check if it's an ISBN (10 or 13 digits)
      const isISBN = book.id && /^(\d{10}|\d{13})$/.test(book.id);
      
      // Check if it's an Open Library ID
      const isOpenLibraryId = book.id?.startsWith("OL") || book.id?.startsWith("/works/") || book.openLibraryId;
      
      // Extract ISBN from industryIdentifiers if available (for Google Books format)
      const volumeInfo = book.volumeInfo || book;
      let isbndbId = isISBN ? book.id : undefined;
      if (!isbndbId && volumeInfo?.industryIdentifiers) {
        const isbn13 = volumeInfo.industryIdentifiers.find((id: any) => id.type === "ISBN_13");
        const isbn10 = volumeInfo.industryIdentifiers.find((id: any) => id.type === "ISBN_10");
        isbndbId = isbn13?.identifier || isbn10?.identifier;
      }

      const openLibraryId = isOpenLibraryId ? (book.openLibraryId || book.id) : undefined;

      // Ensure we have at least one identifier
      if (!mongoId && !isbndbId && !openLibraryId) {
        toast.error("Unable to identify book. Please try a different book.");
        return;
      }

      const requestBody: any = {
        action: "add",
      };

      if (mongoId) {
        requestBody.bookId = mongoId;
      }
      if (isbndbId) {
        requestBody.isbndbId = isbndbId;
      }
      if (openLibraryId) {
        requestBody.openLibraryId = openLibraryId;
      }

      const response = await fetch(`/api/users/${encodeURIComponent(username)}/lists/${listId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        setList(data.list);
        toast.success("Book added to list!");
        setIsSearchOpen(false);
        setSearchQuery("");
        setSearchResults([]);
      } else {
        const error = await response.json().catch(() => ({}));
        toast.error(error.error || error.details || "Failed to add book");
      }
    } catch (err) {
      console.error("Error adding book:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to add book";
      toast.error(errorMessage);
    } finally {
      setIsAddingBook(false);
    }
  };

  const handleRemoveBook = async (bookId: string) => {
    if (!list || !username || !listId || !canEdit) return;

    try {
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/lists/${listId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          bookId: bookId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setList(data.list);
        toast.success("Book removed from list!");
      } else {
        const error = await response.json().catch(() => ({}));
        toast.error(error.error || "Failed to remove book");
      }
    } catch (err) {
      console.error("Error removing book:", err);
      toast.error("Failed to remove book");
    }
  };

  const fetchAllowedUsers = React.useCallback(async () => {
    if (!username || !listId || !isOwnList || list?.isPublic !== false) return;

    setIsLoadingAllowedUsers(true);
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/lists/${listId}/access`);
      if (response.ok) {
        const data = await response.json();
        setAllowedUsers(data.allowedUsers || []);
      }
    } catch (err) {
      console.error("Error fetching allowed users:", err);
    } finally {
      setIsLoadingAllowedUsers(false);
    }
  }, [username, listId, isOwnList, list?.isPublic]);

  // Fetch allowed users when share modal opens for private lists
  React.useEffect(() => {
    if (isShareOpen && list?.isPublic === false && isOwnList) {
      fetchAllowedUsers();
    }
  }, [isShareOpen, list?.isPublic, isOwnList, fetchAllowedUsers]);

  // Fetch following list when share modal opens
  React.useEffect(() => {
    if (isShareOpen && session?.user?.username) {
      let isMounted = true;
      
      setIsLoadingFollowing(true);
      fetch(`/api/users/${encodeURIComponent(session.user.username)}/following`)
        .then((res) => {
          if (!isMounted) return null;
          if (!res.ok) {
            throw new Error(`Failed to fetch following: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (!isMounted || !data) return;
          setFollowing(Array.isArray(data.following) ? data.following : []);
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error("Error fetching following:", err);
          setFollowing([]);
        })
        .finally(() => {
          if (isMounted) {
            setIsLoadingFollowing(false);
          }
        });

      return () => {
        isMounted = false;
      };
    } else if (!isShareOpen) {
      // Reset when modal closes
      setFollowing([]);
      setShareSearchQuery("");
    }
  }, [isShareOpen, session?.user?.username]);

  const handleCopyLink = async () => {
    try {
      const url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard!");
      } else {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        toast.success("Link copied to clipboard!");
      }
    } catch (err) {
      console.error("Error copying link:", err);
      toast.error("Failed to copy link");
    }
  };

  const handleShareToSocial = (platform: string) => {
    try {
      const url = encodeURIComponent(window.location.href);
      const title = encodeURIComponent(list?.title || "Check out this list");
      let shareUrl = "";

      switch (platform) {
        case "whatsapp":
          shareUrl = `https://wa.me/?text=${title}%20${url}`;
          break;
        case "messenger":
          shareUrl = `https://www.facebook.com/dialog/send?link=${url}&app_id=YOUR_APP_ID`;
          break;
        case "facebook":
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
          break;
        case "x":
          shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
          break;
      }

      if (shareUrl) {
        const opened = window.open(shareUrl, "_blank", "width=600,height=400");
        if (!opened) {
          toast.error("Popup blocked. Please allow popups for this site.");
        }
      }
    } catch (err) {
      console.error("Error sharing to social:", err);
      toast.error("Failed to share");
    }
  };

  const handleSendToList = async (targetUsername: string) => {
    if (!username || !listId || !session?.user?.username) return;

    // For private lists, grant access instead of sharing
    if (list?.isPublic === false) {
      await handleGrantAccess(targetUsername);
      return;
    }

    try {
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/lists/${listId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUsername: targetUsername,
        }),
      });

      if (response.ok) {
        toast.success(`List shared with @${targetUsername}!`);
      } else {
        let error: any = {};
        try {
          const text = await response.text();
          error = text ? JSON.parse(text) : {};
        } catch (e) {
          console.error("Failed to parse error response:", e);
        }
        console.error("Share list error response:", error, "Status:", response.status);
        toast.error(error.error || error.details || `Failed to share list (${response.status})`);
      }
    } catch (err) {
      console.error("Error sharing list:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to share list";
      toast.error(errorMessage);
    }
  };

  const handleGrantAccess = async (targetUsername: string) => {
    if (!username || !listId || !session?.user?.username) return;

    setIsGrantingAccess(true);
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/lists/${listId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUsername: targetUsername,
          action: "grant",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Access granted to @${targetUsername}!`);
        // Refresh allowed users list
        fetchAllowedUsers();
      } else {
        let error: any = {};
        try {
          const text = await response.text();
          error = text ? JSON.parse(text) : {};
        } catch (e) {
          console.error("Failed to parse error response:", e);
        }
        toast.error(error.error || error.details || `Failed to grant access (${response.status})`);
      }
    } catch (err) {
      console.error("Error granting access:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to grant access";
      toast.error(errorMessage);
    } finally {
      setIsGrantingAccess(false);
    }
  };

  const handleRevokeAccess = async (targetUsername: string) => {
    if (!username || !listId || !session?.user?.username) return;

    try {
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/lists/${listId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUsername: targetUsername,
          action: "revoke",
        }),
      });

      if (response.ok) {
        toast.success(`Access revoked from @${targetUsername}`);
        // Refresh allowed users list
        fetchAllowedUsers();
      } else {
        let error: any = {};
        try {
          const text = await response.text();
          error = text ? JSON.parse(text) : {};
        } catch (e) {
          console.error("Failed to parse error response:", e);
        }
        toast.error(error.error || error.details || `Failed to revoke access (${response.status})`);
      }
    } catch (err) {
      console.error("Error revoking access:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to revoke access";
      toast.error(errorMessage);
    }
  };

  const handleSaveList = async () => {
    if (!username || !listId || !session?.user?.username || isSavingList || isListSaved) return;

    try {
      setIsSavingList(true);
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/lists/${listId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        setIsListSaved(true);
        setSavedListId(data.list?.id || null);
        toast.success("List saved to your profile!");
      } else {
        const error = await response.json().catch(() => ({}));
        if (error.error === "List already saved") {
          setIsListSaved(true);
          setSavedListId(error.listId || null);
          toast.info("List already saved");
        } else {
          toast.error(error.error || "Failed to save list");
        }
      }
    } catch (err) {
      console.error("Error saving list:", err);
      toast.error("Failed to save list");
    } finally {
      setIsSavingList(false);
    }
  };

  const handleRemoveSavedList = async () => {
    if (!savedListId || !session?.user?.username || isRemovingList) return;

    try {
      setIsRemovingList(true);
      const response = await fetch(`/api/users/${encodeURIComponent(session.user.username)}/lists/${savedListId}/save`, {
        method: "DELETE",
      });

      if (response.ok) {
        setIsListSaved(false);
        setSavedListId(null);
        toast.success("List removed from your profile!");
      } else {
        const error = await response.json().catch(() => ({}));
        toast.error(error.error || "Failed to remove list");
      }
    } catch (err) {
      console.error("Error removing list:", err);
      toast.error("Failed to remove list");
    } finally {
      setIsRemovingList(false);
    }
  };

  const filteredFollowing = Array.isArray(following)
    ? following.filter((user) => {
        if (!shareSearchQuery.trim()) return true;
        const query = shareSearchQuery.toLowerCase();
        return (
          user?.name?.toLowerCase().includes(query) ||
          user?.username?.toLowerCase().includes(query) ||
          user?.email?.toLowerCase().includes(query)
        );
      })
    : [];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <TetrisLoading />
      </div>
    );
  }

  // Show private list message
  if (isPrivateList) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 mt-16">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="max-w-md space-y-4">
              <h1 className="text-2xl font-bold text-foreground">This list is private</h1>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !list) {
    return <NotFoundPage />;
  }

  const coverImage = (book: Book) =>
    book.volumeInfo?.imageLinks?.thumbnail ||
    book.volumeInfo?.imageLinks?.smallThumbnail ||
    book.volumeInfo?.imageLinks?.medium ||
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80";

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 mt-16">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">{list.title}</h1>
              <div className="flex items-center gap-2">
                <p className="text-lg text-muted-foreground">
                  {list.booksCount} {list.booksCount === 1 ? "book" : "books"}
                </p>
                {isSavedList && creatorUsername && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <p className="text-lg text-muted-foreground">
                      by{" "}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/u/${creatorUsername}`);
                        }}
                        className="font-medium text-foreground hover:underline cursor-pointer"
                      >
                        @{creatorUsername}
                      </button>
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {/* Show Save/Remove button for non-owners or saved lists */}
              {((isSharedList && !isOwnList) || (isOwnList && isSavedList)) && (
                <Button 
                  variant={isListSaved ? "outline" : "default"}
                  size="sm" 
                  onClick={isListSaved ? handleRemoveSavedList : handleSaveList}
                  disabled={isSavingList || isRemovingList}
                >
                  <Bookmark className={`mr-2 h-4 w-4 ${isListSaved ? "fill-current" : ""}`} />
                  {isListSaved 
                    ? (isRemovingList ? "Removing..." : "Remove") 
                    : (isSavingList ? "Saving..." : "Save list")
                  }
                </Button>
              )}
              {/* Show share button only for owners (for private lists, only owner can see/manage access) */}
              {isOwnList && (
                <Button variant="outline" size="sm" onClick={() => setIsShareOpen(true)}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              )}
              {/* Show edit/delete dropdown only for owners */}
              {canEdit && (
                <Dropdown.Root isOpen={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                  <Dropdown.Trigger
                    className="flex-shrink-0 rounded-lg p-2 transition hover:bg-foreground/5"
                  >
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </Dropdown.Trigger>
                  <Dropdown.Popover>
                    <Dropdown.Menu>
                      <Dropdown.Item
                        label="Edit details"
                        icon={Edit}
                        onClick={() => {
                          setIsEditDialogOpen(true);
                          setIsDropdownOpen(false);
                        }}
                      />
                      <Dropdown.Item
                        label="Delete list"
                        icon={Trash2}
                        onClick={() => {
                          setIsDeleteDialogOpen(true);
                          setIsDropdownOpen(false);
                        }}
                      />
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown.Root>
              )}
            </div>
          </div>
        </div>

        {/* Books Grid */}
        {list.booksCount === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)] text-center">
            <p className="text-xl text-muted-foreground">
              There aren't any books on this list yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {list.books.map((book) => (
              <div
                key={book._id}
                className="group relative aspect-[2/3] overflow-hidden rounded-lg cursor-pointer"
                onClick={() => {
                  const slug = createBookSlug(
                    book.volumeInfo.title,
                    book._id
                  );
                  router.push(`/b/${slug}`);
                }}
              >
                <Image
                  src={coverImage(book)}
                  alt={book.volumeInfo.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 16vw"
                  quality={100}
                  unoptimized={true}
                />
                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveBook(book._id);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Floating Add Button */}
        {canEdit && (
          <>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center z-50"
            >
              <Plus className="h-6 w-6" />
            </button>

            {/* Search Modal */}
            <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
              <DialogContent className="max-w-2xl max-h-[80vh] p-0 flex flex-col">
                <div className="p-6 flex flex-col min-w-0 flex-1 overflow-hidden">
                  <DialogHeader className="flex-shrink-0">
                    <DialogTitle>Add books to list</DialogTitle>
                  </DialogHeader>
                  <div className="flex-shrink-0 mt-4 mb-4">
                    <Input
                      placeholder="Search for books..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full focus-visible:border-foreground dark:focus-visible:border-white"
                      autoFocus
                    />
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                    {isSearching ? (
                      <div className="flex items-center justify-center py-8">
                        <p className="text-muted-foreground">Searching...</p>
                      </div>
                    ) : searchResults.length === 0 && searchQuery.trim() ? (
                      <div className="flex items-center justify-center py-8">
                        <p className="text-muted-foreground">No books found</p>
                      </div>
                    ) : (
                      <div className="space-y-2 pr-2">
                        {searchResults.map((book) => {
                          const bookData = book.volumeInfo || book;
                          const cover =
                            bookData.imageLinks?.thumbnail ||
                            bookData.imageLinks?.smallThumbnail ||
                            "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80";

                          return (
                            <button
                              key={book.id || book._id}
                              onClick={() => handleAddBook(book)}
                              disabled={isAddingBook}
                              className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left min-w-0"
                            >
                              <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded">
                                <Image
                                  src={cover}
                                  alt={bookData.title}
                                  fill
                                  className="object-cover"
                                  sizes="48px"
                                  quality={100}
                                  unoptimized={true}
                                />
                              </div>
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <p className="font-medium text-foreground truncate">
                                  {bookData.title}
                                </p>
                                {bookData.authors && (
                                  <p className="text-sm text-muted-foreground truncate">
                                    {bookData.authors.join(", ")}
                                  </p>
                                )}
                              </div>
                              <Plus className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}

        {/* Share/Access Modal */}
        <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
          <DialogContent className="max-w-md max-h-[80vh] p-0 flex flex-col">
            <div className="p-6 flex flex-col min-w-0 flex-1 overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>
                  {list?.isPublic === false ? "Manage Access" : "Share"}
                </DialogTitle>
              </DialogHeader>

              {/* Quick Share Options - Only for public lists */}
              {list?.isPublic !== false && (
                <div className="flex gap-4 mt-6 mb-6 justify-center">
                <button
                  onClick={handleCopyLink}
                  className="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity"
                >
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <Link2 className="h-6 w-6 text-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">Copy link</span>
                </button>
                <button
                  onClick={() => handleShareToSocial("whatsapp")}
                  className="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity"
                >
                  <div className="h-12 w-12 rounded-full bg-[#25D366] flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-muted-foreground">WhatsApp</span>
                </button>
                <button
                  onClick={() => handleShareToSocial("messenger")}
                  className="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity"
                >
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#0084FF] to-[#006AFF] flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16l-1.97 9.272c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.12l-6.87 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-muted-foreground">Messenger</span>
                </button>
                <button
                  onClick={() => handleShareToSocial("facebook")}
                  className="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity"
                >
                  <div className="h-12 w-12 rounded-full bg-[#1877F2] flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-muted-foreground">Facebook</span>
                </button>
                <button
                  onClick={() => handleShareToSocial("x")}
                  className="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity"
                >
                  <div className="h-12 w-12 rounded-full bg-black dark:bg-white flex items-center justify-center">
                    <svg className="h-6 w-6 text-white dark:text-black" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-muted-foreground">X</span>
                </button>
              </div>
              )}

              {/* Show allowed users for private lists */}
              {list?.isPublic === false && isOwnList && (
                <>
                  <div className="mt-4 mb-4">
                    <h3 className="text-sm font-medium mb-2">Users with access</h3>
                    {isLoadingAllowedUsers ? (
                      <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : allowedUsers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No users have access yet</p>
                    ) : (
                      <div className="space-y-2">
                        {allowedUsers.map((user: any) => (
                          <div
                            key={user.username}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              <div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted">
                                {user.avatar ? (
                                  <Image
                                    src={user.avatar}
                                    alt={user.name || user.username}
                                    fill
                                    className="object-cover"
                                    sizes="32px"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs font-medium">
                                    {(user.name || user.username)?.[0]?.toUpperCase() || "?"}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium">@{user.username}</p>
                                {user.name && (
                                  <p className="text-xs text-muted-foreground">{user.name}</p>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRevokeAccess(user.username)}
                            >
                              Revoke
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="border-t border-border my-4"></div>
                </>
              )}

              <div className="border-t border-border my-4"></div>

              {/* Search Bar */}
              <div className="flex-shrink-0 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                  <Input
                    placeholder={list?.isPublic === false ? "Search by username to grant access" : "Search by name or email"}
                    value={shareSearchQuery}
                    onChange={(e) => setShareSearchQuery(e.target.value)}
                    className="w-full !pl-10 pr-4 focus-visible:border-foreground dark:focus-visible:border-white"
                  />
                </div>
              </div>

              {/* Following List */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {isLoadingFollowing ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">Loading...</p>
                  </div>
                ) : filteredFollowing.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">
                      {shareSearchQuery.trim() ? "No users found" : "No people to share with"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredFollowing.map((user) => {
                      const defaultAvatar = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%239ca3af'/%3E%3Cpath d='M50 30c-8.284 0-15 6.716-15 15 0 5.989 3.501 11.148 8.535 13.526C37.514 62.951 32 70.16 32 78.5h36c0-8.34-5.514-15.549-13.535-19.974C59.499 56.148 63 50.989 63 45c0-8.284-6.716-15-15-15z' fill='white' opacity='0.8'/%3E%3C/svg%3E`;
                      const avatar = user.avatar || defaultAvatar;
                      const initials = user.name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) || user.username?.[0]?.toUpperCase() || "?";

                      return (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="relative h-10 w-10 flex-shrink-0 rounded-full overflow-hidden bg-muted">
                            {user.avatar ? (
                              <Image
                                src={avatar}
                                alt={user.name || user.username}
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-sm font-medium text-foreground">
                                {initials}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {user.name || user.username}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              @{user.username}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendToList(user.username)}
                            className="flex-shrink-0"
                            disabled={isGrantingAccess || (list?.isPublic === false && allowedUsers.some((u: any) => u.username === user.username))}
                          >
                            {list?.isPublic === false ? (
                              <>
                                {allowedUsers.some((u: any) => u.username === user.username) ? (
                                  "Has Access"
                                ) : (
                                  <>
                                    <Send className="h-4 w-4 mr-1" />
                                    Grant Access
                                  </>
                                )}
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-1" />
                                Send
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit List Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md p-0 sm:rounded-2xl">
            <DialogHeader className="sr-only">
              <DialogTitle>Edit list details</DialogTitle>
            </DialogHeader>
            <div className="p-6">
              {/* List Image Placeholder */}
              <div className="mt-6 mb-6">
                <div className="relative w-full rounded-lg bg-muted/40 border border-border/60 overflow-hidden">
                  <div className="aspect-[4/3] flex items-center justify-center">
                    <div className="grid grid-cols-2 gap-1.5 w-full h-full p-2.5">
                      <div className="bg-muted/50 rounded-sm"></div>
                      <div className="bg-muted/50 rounded-sm"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* List Name Input */}
              <div className="space-y-2 mb-6">
                <Label htmlFor="edit-list-name" className="text-sm font-medium">
                  List name
                </Label>
                <Input
                  id="edit-list-name"
                  placeholder="Name your list"
                  value={editListName}
                  onChange={(e) => setEditListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && editListName.trim()) {
                      handleEditList();
                    }
                  }}
                  className="w-full focus-visible:border-foreground dark:focus-visible:border-white"
                  autoFocus
                />
              </div>

              {/* Make this list secret */}
              <div className="mb-6">
                <div className="flex items-center justify-between rounded-lg border border-border/50 p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setEditIsSecret(!editIsSecret)}
                >
                  <div className="flex-1">
                    <Label htmlFor="edit-secret-toggle" className="text-sm font-medium cursor-pointer">
                      Make this list secret
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Only people you share the link with can see this list
                    </p>
                  </div>
                  <Switch
                    id="edit-secret-toggle"
                    checked={editIsSecret}
                    onCheckedChange={setEditIsSecret}
                  />
                </div>
              </div>

              {/* Update Button */}
              <Button
                onClick={handleEditList}
                disabled={!editListName.trim() || isUpdating}
                variant={editListName.trim() ? "default" : "secondary"}
                className="w-full h-11 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? "Updating..." : "Update"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-md p-0 sm:rounded-2xl">
            <div className="p-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-semibold">Delete list?</DialogTitle>
              </DialogHeader>
              
              <p className="mt-4 text-muted-foreground">
                This will permanently delete "{list?.title}" from your profile and remove it from anyone who saved it. This action cannot be undone.
              </p>

              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="flex-1"
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteList}
                  className="flex-1"
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}

