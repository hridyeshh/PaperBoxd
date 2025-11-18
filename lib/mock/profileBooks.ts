export type ProfileBook = {
  id: string;
  title: string;
  author: string;
  cover: string;
  mood?: string;
  bookId?: string; // MongoDB _id for navigation
  isbndbId?: string; // ISBNdb ID for navigation
  openLibraryId?: string; // Open Library ID for navigation
};

export type BookshelfBook = ProfileBook & {
  finishedOn: string;
  format?: "Print" | "Digital" | "Audio";
  rating?: number;
  thoughts?: string;
};

export type LikedBook = ProfileBook & {
  reason?: string;
};

export type TbrBook = ProfileBook & {
  addedOn: string;
  urgency?: "Soon" | "Eventually" | "This weekend";
  whyNow?: string;
};

export type ReadingList = {
  id: string;
  title: string;
  booksCount: number;
  updatedAgo: string;
  cover: string;
};

export const topBooks: ProfileBook[] = [
  {
    id: "top-1",
    title: "Tomorrow, and Tomorrow, and Tomorrow",
    author: "Gabrielle Zevin",
    mood: "Found family · Creative partnership",
    cover: "https://images.unsplash.com/photo-1529651737248-dad5e287768e?w=800&q=80",
  },
  {
    id: "top-2",
    title: "Fourth Wing",
    author: "Rebecca Yarros",
    mood: "Dragons · Romantasy heat",
    cover: "https://images.unsplash.com/photo-1485322551133-3a4c27a9d925?w=800&q=80",
  },
  {
    id: "top-3",
    title: "Yellowface",
    author: "R. F. Kuang",
    mood: "Publishing drama · Dark satire",
    cover: "https://images.unsplash.com/photo-1455885666463-1ea8f31c0d44?w=800&q=80",
  },
  {
    id: "top-4",
    title: "Sea of Tranquility",
    author: "Emily St. John Mandel",
    mood: "Speculative · Haunting timelines",
    cover: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80",
  },
];

export const favoriteBooks: ProfileBook[] = [
  {
    id: "fav-1",
    title: "The Seven Husbands of Evelyn Hugo",
    author: "Taylor Jenkins Reid",
    mood: "Old Hollywood · Memoir vibes",
    cover: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80",
  },
  {
    id: "fav-2",
    title: "Pachinko",
    author: "Min Jin Lee",
    mood: "Sprawling family saga",
    cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80",
  },
  {
    id: "fav-3",
    title: "Project Hail Mary",
    author: "Andy Weir",
    mood: "Hopeful sci-fi · Buddy story",
    cover: "https://images.unsplash.com/photo-1455885666463-1ea8f31c0d44?w=800&q=80",
  },
  {
    id: "fav-4",
    title: "Babel",
    author: "R. F. Kuang",
    mood: "Dark academia · Translation magic",
    cover: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&q=80",
  },
  {
    id: "fav-5",
    title: "The House in the Cerulean Sea",
    author: "TJ Klune",
    mood: "Cozy found family",
    cover: "https://images.unsplash.com/photo-1529651737248-dad5e287768e?w=800&q=80",
  },
  {
    id: "fav-6",
    title: "The Night Circus",
    author: "Erin Morgenstern",
    mood: "Lush whimsy · Slow-burn romance",
    cover: "https://images.unsplash.com/photo-1485322551133-3a4c27a9d925?w=800&q=80",
  },
];

export const bookshelfBooks: BookshelfBook[] = [
  {
    id: "shelf-1",
    title: "The Midnight Library",
    author: "Matt Haig",
    cover: "https://images.unsplash.com/photo-1529651737248-dad5e287768e?w=800&q=80",
    finishedOn: "Finished Jan 2025",
    format: "Print",
    rating: 5,
    thoughts: "Still thinking about the multiverse what-ifs.",
  },
  {
    id: "shelf-2",
    title: "Lessons in Chemistry",
    author: "Bonnie Garmus",
    cover: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&q=80",
    finishedOn: "Finished Dec 2024",
    format: "Audio",
    rating: 4,
    thoughts: "Elizabeth Zott forever. The narration was perfect.",
  },
  {
    id: "shelf-3",
    title: "The Atlas Six",
    author: "Olivie Blake",
    cover: "https://images.unsplash.com/photo-1455885666463-1ea8f31c0d44?w=800&q=80",
    finishedOn: "Finished Nov 2024",
    format: "Digital",
    rating: 4,
    thoughts: "Dark academia cravings satisfied.",
  },
  {
    id: "shelf-4",
    title: "Tomorrow, and Tomorrow, and Tomorrow",
    author: "Gabrielle Zevin",
    cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80",
    finishedOn: "Finished Sep 2024",
    format: "Print",
    rating: 5,
    thoughts: "Favorite lines highlighted everywhere.",
  },
  {
    id: "shelf-5",
    title: "The Secret History",
    author: "Donna Tartt",
    cover: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&q=80",
    finishedOn: "Finished Aug 2024",
    format: "Print",
    rating: 4,
    thoughts: "Dark academia roots and Greek lessons hit different.",
  },
  {
    id: "shelf-6",
    title: "Emily Wilde's Encyclopaedia of Faeries",
    author: "Heather Fawcett",
    cover: "https://images.unsplash.com/photo-1485322551133-3a4c27a9d925?w=800&q=80",
    finishedOn: "Finished Jul 2024",
    format: "Digital",
    rating: 4,
    thoughts: "Cozy academia plus cranky scholars, yes please.",
  },
  {
    id: "shelf-7",
    title: "Iron Flame",
    author: "Rebecca Yarros",
    cover: "https://images.unsplash.com/photo-1455885666463-1ea8f31c0d44?w=800&q=80",
    finishedOn: "Finished Jun 2024",
    format: "Audio",
    rating: 5,
    thoughts: "Dragon squad continues to ruin my sleep schedule.",
  },
  {
    id: "shelf-8",
    title: "The Poppy War",
    author: "R. F. Kuang",
    cover: "https://images.unsplash.com/photo-1529651737248-dad5e287768e?w=800&q=80",
    finishedOn: "Finished May 2024",
    format: "Digital",
    rating: 5,
    thoughts: "Brutal, brilliant, and still breaking my heart.",
  },
  {
    id: "shelf-9",
    title: "Legends & Lattes",
    author: "Travis Baldree",
    cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80",
    finishedOn: "Finished Apr 2024",
    format: "Audio",
    rating: 4,
    thoughts: "Cinnamon roll orc cafe core memories.",
  },
  {
    id: "shelf-10",
    title: "Happy Place",
    author: "Emily Henry",
    cover: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80",
    finishedOn: "Finished Mar 2024",
    format: "Print",
    rating: 4,
    thoughts: "Vacation home angst done right.",
  },
  {
    id: "shelf-11",
    title: "Tress of the Emerald Sea",
    author: "Brandon Sanderson",
    cover: "https://images.unsplash.com/photo-1485322551133-3a4c27a9d925?w=800&q=80",
    finishedOn: "Finished Feb 2024",
    format: "Print",
    rating: 5,
    thoughts: "Cosmere fairytale with the best narrator gossip.",
  },
  {
    id: "shelf-12",
    title: "Station Eleven",
    author: "Emily St. John Mandel",
    cover: "https://images.unsplash.com/photo-1455885666463-1ea8f31c0d44?w=800&q=80",
    finishedOn: "Finished Jan 2024",
    format: "Print",
    rating: 5,
    thoughts: "Because survival is insufficient.",
  },
  {
    id: "shelf-13",
    title: "The Vanishing Half",
    author: "Brit Bennett",
    cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80",
    finishedOn: "Finished Dec 2023",
    format: "Digital",
    rating: 4,
    thoughts: "Generational echoes that linger long after.",
  },
  {
    id: "shelf-14",
    title: "The Night Watchman",
    author: "Louise Erdrich",
    cover: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80",
    finishedOn: "Finished Nov 2023",
    format: "Print",
    rating: 4,
    thoughts: "Slow burn resistance narrative based on family history.",
  },
];

export const likedBooks: LikedBook[] = [
  {
    id: "liked-1",
    title: "Divine Rivals",
    author: "Rebecca Ross",
    cover: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80",
    reason: "For the typewriters-and-trenches romance vibes.",
  },
  {
    id: "liked-2",
    title: "Babel",
    author: "R. F. Kuang",
    cover: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&q=80",
    reason: "Lingering obsession with translation magic and rebellion.",
  },
  {
    id: "liked-3",
    title: "A Court of Mist and Fury",
    author: "Sarah J. Maas",
    cover: "https://images.unsplash.com/photo-1485322551133-3a4c27a9d925?w=800&q=80",
    reason: "Night Court comfort rereads forever.",
  },
  {
    id: "liked-4",
    title: "The Song of Achilles",
    author: "Madeline Miller",
    cover: "https://images.unsplash.com/photo-1529651737248-dad5e287768e?w=800&q=80",
    reason: "Epic heartbreak with lyrical prose.",
  },
  {
    id: "liked-5",
    title: "Fourth Wing",
    author: "Rebecca Yarros",
    cover: "https://images.unsplash.com/photo-1455885666463-1ea8f31c0d44?w=800&q=80",
    reason: "Marked this so I can revisit the dragon chaos anytime.",
  },
  {
    id: "liked-6",
    title: "Legends & Lattes",
    author: "Travis Baldree",
    cover: "https://images.unsplash.com/photo-1455885666463-1ea8f31c0d44?w=800&q=80",
    reason: "Because cozy fantasy and coffee is a lifestyle.",
  },
  {
    id: "liked-7",
    title: "Iron Widow",
    author: "Xiran Jay Zhao",
    cover: "https://images.unsplash.com/photo-1529651737248-dad5e287768e?w=800&q=80",
    reason: "Furious feminist mecha retelling I won't shut up about.",
  },
  {
    id: "liked-8",
    title: "Sorcery of Thorns",
    author: "Margaret Rogerson",
    cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80",
    reason: "Magical libraries, sentient grimoires, say no more.",
  },
  {
    id: "liked-9",
    title: "The Priory of the Orange Tree",
    author: "Samantha Shannon",
    cover: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80",
    reason: "Epic sapphic dragon saga deserves its permanent star.",
  },
  {
    id: "liked-10",
    title: "Book Lovers",
    author: "Emily Henry",
    cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80",
    reason: "Obsessed with every publishing in-joke and banter.",
  },
  {
    id: "liked-11",
    title: "Yumi and the Nightmare Painter",
    author: "Brandon Sanderson",
    cover: "https://images.unsplash.com/photo-1529651737248-dad5e287768e?w=800&q=80",
    reason: "Cosmere whimsy with longing letters; instant fave.",
  },
  {
    id: "liked-12",
    title: "Remarkably Bright Creatures",
    author: "Shelby Van Pelt",
    cover: "https://images.unsplash.com/photo-1485322551133-3a4c27a9d925?w=800&q=80",
    reason: "Mischievous octopus POV and found family sweetness.",
  },
];

export const tbrBooks: TbrBook[] = [
  {
    id: "tbr-1",
    title: "The Warm Hands of Ghosts",
    author: "Katherine Arden",
    cover: "https://images.unsplash.com/photo-1455885666463-1ea8f31c0d44?w=800&q=80",
    addedOn: "Added Feb 2025",
    urgency: "Soon",
    whyNow: "Need some lyrical WWI weirdness before spring.",
  },
  {
    id: "tbr-2",
    title: "House of Flame and Shadow",
    author: "Sarah J. Maas",
    cover: "https://images.unsplash.com/photo-1485322551133-3a4c27a9d925?w=800&q=80",
    addedOn: "Added Jan 2025",
    urgency: "This weekend",
    whyNow: "Because spoilers are coming for the Crescent City finale.",
  },
  {
    id: "tbr-3",
    title: "The Women",
    author: "Kristin Hannah",
    cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80",
    addedOn: "Added Jan 2025",
    urgency: "Soon",
    whyNow: "Vietnam nurse drama for historical feels.",
  },
  {
    id: "tbr-4",
    title: "System Collapse",
    author: "Martha Wells",
    cover: "https://images.unsplash.com/photo-1529651737248-dad5e287768e?w=800&q=80",
    addedOn: "Added Dec 2024",
    urgency: "Eventually",
    whyNow: "More Murderbot, always.",
  },
  {
    id: "tbr-5",
    title: "The Silent Patient",
    author: "Alex Michaelides",
    cover: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80",
    addedOn: "Added Nov 2024",
    urgency: "Eventually",
    whyNow: "Thriller palate cleanser between fantasies.",
  },
  {
    id: "tbr-6",
    title: "When Women Were Dragons",
    author: "Kelly Barnhill",
    cover: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&q=80",
    addedOn: "Added Oct 2024",
    urgency: "Soon",
    whyNow: "Need more dragon feminism on the shelf.",
  },
  {
    id: "tbr-7",
    title: "The Frugal Wizard’s Handbook for Surviving Medieval England",
    author: "Brandon Sanderson",
    cover: "https://images.unsplash.com/photo-1529651737248-dad5e287768e?w=800&q=80",
    addedOn: "Added Oct 2024",
    urgency: "Eventually",
    whyNow: "Cosmere oddity for a rainy Sunday.",
  },
  {
    id: "tbr-8",
    title: "The Adventures of Amina al-Sirafi",
    author: "S. A. Chakraborty",
    cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80",
    addedOn: "Added Sep 2024",
    urgency: "Soon",
    whyNow: "Pirate moms plus djinn heists? Obviously.",
  },
  {
    id: "tbr-9",
    title: "The Green Bone Saga: Jade City",
    author: "Fonda Lee",
    cover: "https://images.unsplash.com/photo-1455885666463-1ea8f31c0d44?w=800&q=80",
    addedOn: "Added Aug 2024",
    urgency: "Eventually",
    whyNow: "Need to finally start this modern fantasy mafia epic.",
  },
  {
    id: "tbr-10",
    title: "Bunny",
    author: "Mona Awad",
    cover: "https://images.unsplash.com/photo-1485322551133-3a4c27a9d925?w=800&q=80",
    addedOn: "Added Jul 2024",
    urgency: "Soon",
    whyNow: "For the freaky MFA fever dream everyone mentions.",
  },
  {
    id: "tbr-11",
    title: "Greenwitch",
    author: "Susan Cooper",
    cover: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80",
    addedOn: "Added Jun 2024",
    urgency: "Eventually",
    whyNow: "Continuing the nostalgic reread.",
  },
  {
    id: "tbr-12",
    title: "Divine Rivals",
    author: "Rebecca Ross",
    cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80",
    addedOn: "Added May 2024",
    urgency: "This weekend",
    whyNow: "Yes, I loved it, but this is the annotated re-read slot.",
  },
];

export const readingLists: ReadingList[] = [
  {
    id: "list-1",
    title: "Coziest winter reads",
    booksCount: 18,
    updatedAgo: "5d",
    cover: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80",
  },
  {
    id: "list-2",
    title: "Dark academia aesthetic",
    booksCount: 9,
    updatedAgo: "1w",
    cover: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80",
  },
  {
    id: "list-3",
    title: "Romantasy obsession",
    booksCount: 14,
    updatedAgo: "2w",
    cover: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80",
  },
  {
    id: "list-4",
    title: "Sci-fi comfort rereads",
    booksCount: 7,
    updatedAgo: "3w",
    cover: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80",
  },
  {
    id: "list-5",
    title: "Myth retellings",
    booksCount: 11,
    updatedAgo: "1mo",
    cover: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80",
  },
  {
    id: "list-6",
    title: "Indie bookstore finds",
    booksCount: 6,
    updatedAgo: "2mo",
    cover: "https://images.unsplash.com/photo-1529651737248-dad5e287768e?w=800&q=80",
  },
];

