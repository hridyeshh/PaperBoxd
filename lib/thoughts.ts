// Go → web shape for thoughts. The profile load (app/api/users/[username]) and
// the Thoughts routes (app/api/users/[username]/thoughts/...) both return this,
// so a tab reload and the first profile paint render identical rows.

interface GoVolumeInfo {
  title?: string;
  authors?: string[];
  imageLinks?: { thumbnail?: string; smallThumbnail?: string; medium?: string };
}

export interface GoThought {
  id: string;
  user_id: string;
  username: string;
  name: string;
  avatar_url?: string | null;
  book_id?: string | null;
  book?: { id: string; slug?: string; volumeInfo?: GoVolumeInfo } | null;
  title?: string | null;
  content: string;
  is_private: boolean;
  rating?: number | null;
  likes_count: number;
  is_liked: boolean;
  reposts_count?: number;
  is_reposted?: boolean;
  thread_root_id?: string | null;
  thread_count?: number;
  reposted_by?: { username: string; name: string } | null;
  can_edit?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Thought {
  id: string;
  authorUsername: string;
  authorName: string;
  authorAvatar: string | null;
  bookId: string | null;
  bookTitle: string | null;
  bookAuthor: string | null;
  bookCover: string | null;
  bookSlug: string | null;
  subject: string | null;
  content: string;
  isPrivate: boolean;
  rating: number | null;
  likesCount: number;
  isLiked: boolean;
  repostsCount: number;
  isReposted: boolean;
  threadRootId: string | null;
  threadCount: number;
  repostedBy: { username: string; name: string } | null;
  canEdit: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toThought(t: GoThought): Thought {
  const vi = t.book?.volumeInfo;
  return {
    id: t.id,
    authorUsername: t.username,
    authorName: t.name || t.username,
    authorAvatar: t.avatar_url ?? null,
    bookId: t.book_id ?? null,
    bookTitle: vi?.title ?? null,
    bookAuthor: vi?.authors?.[0] ?? null,
    // Empty, not a stock photo: clients fall back to their own neutral placeholder.
    bookCover: vi?.imageLinks?.thumbnail ?? vi?.imageLinks?.smallThumbnail ?? vi?.imageLinks?.medium ?? null,
    bookSlug: t.book?.slug || null,
    subject: t.title ?? null,
    content: t.content,
    isPrivate: t.is_private,
    rating: t.rating ?? null,
    likesCount: t.likes_count ?? 0,
    isLiked: t.is_liked ?? false,
    repostsCount: t.reposts_count ?? 0,
    isReposted: t.is_reposted ?? false,
    threadRootId: t.thread_root_id ?? null,
    threadCount: t.thread_count ?? 0,
    repostedBy: t.reposted_by ?? null,
    canEdit: t.can_edit ?? false,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

/** Story image for a thought, rendered by app/api/og/thought. `thread` labels a thread position, e.g. "2/3". */
export function thoughtShareImageUrl(t: Thought, thread?: string): string {
  const q = new URLSearchParams({ text: thoughtPlainText(t.content).slice(0, 600), username: t.authorUsername });
  if (t.bookTitle) q.set("book", t.bookTitle);
  if (t.bookAuthor) q.set("author", t.bookAuthor);
  if (t.bookCover) q.set("cover", t.bookCover);
  if (thread) q.set("thread", thread);
  return `/api/og/thought?${q}`;
}

/** Plain text of a thought's rich-text HTML, for previews and share cards. */
export function thoughtPlainText(html: string): string {
  return html
    .replace(/<\/(p|div|li|h[1-6])>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
