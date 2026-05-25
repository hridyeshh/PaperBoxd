import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
	Modal,
	ModalContent,
	ModalTitle,
	ModalTrigger,
} from '@/components/ui/primitives/modal';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/primitives/command';

import { LucideIcon, SearchIcon, BookOpen, Sparkles, Wand2 } from 'lucide-react';
import { cn, DEFAULT_AVATAR } from '@/lib/utils';
import { createBookSlug } from '@/lib/utils/book-slug';

export type CommandItem = {
	id: string;
	title: string;
	description: string;
	category: string;
	icon?: LucideIcon;
	shortcut?: string;
};

type BookSearchResult = {
	id: string;
	title: string;
	authors?: string[];
	description?: string;
	imageLinks?: {
		thumbnail?: string;
		smallThumbnail?: string;
	};
};

type UserSearchResult = {
	id: string;
	username: string;
	name: string;
	avatar?: string;
};

type SearchType = 'Books' | 'User' | 'Vibe';

type VibeSearchItem = BookSearchResult & {
  matchReason?: string;
  similarityScore?: number;
};

type SearchModalProps = {
	children: React.ReactNode;
	data?: CommandItem[]; // Optional, currently unused but kept for future use
};

// Type for custom event detail
type OpenSearchModalEventDetail = {
	mode?: string;
	maxBooks?: number;
	currentBooks?: string[];
};

// Extend Window interface for custom events
declare global {
	interface WindowEventMap {
		'open-search-modal': CustomEvent<OpenSearchModalEventDetail>;
	}
}

// Types for API responses
type BookSearchItem = {
	id: string;
	volumeInfo?: {
		title?: string;
		authors?: string[];
		description?: string;
		imageLinks?: {
			thumbnail?: string;
			smallThumbnail?: string;
		};
	};
	_id?: { toString(): string };
	title?: string;
	authors?: string[];
	description?: string;
	imageLinks?: {
		thumbnail?: string;
		smallThumbnail?: string;
	};
};

type BookSearchResponse = 
	| { items?: BookSearchItem[]; books?: never; kind?: string; totalItems?: number }
	| { books?: BookSearchItem[]; items?: never };

type UserSearchResponse = {
	users?: UserSearchResult[];
	count?: number;
};

type SearchResponse = BookSearchResponse | UserSearchResponse;

// Extended BookSearchResult with optional _raw field
type BookSearchResultWithRaw = BookSearchResult & {
	_raw?: BookSearchItem;
};


const VIBE_PROMPTS = [
	"Something dark and claustrophobic",
	"A slow summer read with romance",
	"Mind-bending sci-fi that questions reality",
	"Books that feel like a long train journey",
] as const;

export function SearchModal({ children }: SearchModalProps) {
	const router = useRouter();
	const [open, setOpen] = React.useState(false);
	const [query, setQuery] = React.useState('');
	const [searchType, setSearchType] = React.useState<SearchType>('Books');
	const [bookResults, setBookResults] = React.useState<BookSearchResult[]>([]);
	const [userResults, setUserResults] = React.useState<UserSearchResult[]>([]);
	const [vibeResults, setVibeResults] = React.useState<VibeSearchItem[]>([]);
	const [vibePersonalised, setVibePersonalised] = React.useState(false);
	const [isSearching, setIsSearching] = React.useState(false);
	const [searchError, setSearchError] = React.useState<string | null>(null);
	const [favoriteMode, setFavoriteMode] = React.useState<{ mode: string; maxBooks: number; currentBooks: string[] } | null>(null);

	React.useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((open) => !open);
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, []);

	// Listen for open-search-modal event
	React.useEffect(() => {
		const handleOpenSearch = (event: WindowEventMap['open-search-modal']) => {
			if (event.detail?.mode === 'favorite-books') {
				setFavoriteMode(event.detail as { mode: string; maxBooks: number; currentBooks: string[] });
				setOpen(true);
				setSearchType('Books');
			}
		};

		window.addEventListener('open-search-modal', handleOpenSearch);
		return () => {
			window.removeEventListener('open-search-modal', handleOpenSearch);
		};
	}, []);

	// Reset favorite mode when modal closes
	React.useEffect(() => {
		if (!open) {
			setFavoriteMode(null);
			setVibeResults([]);
			setVibePersonalised(false);
		}
	}, [open]);

	// Debounced search based on search type
	React.useEffect(() => {
		if (!query.trim()) {
			setBookResults([]);
			setUserResults([]);
			setVibeResults([]);
			setVibePersonalised(false);
			setSearchError(null);
			return;
		}

		// Vibe search requires at least 10 characters
		if (searchType === 'Vibe' && query.trim().length < 10) {
			setVibeResults([]);
			setSearchError(null);
			return;
		}

		const debounceMs = searchType === 'Vibe' ? 600 : 300;
		const timeoutId = setTimeout(async () => {
			setIsSearching(true);
			setSearchError(null);
			
			try {
				let response: Response;
				let result: SearchResponse;

				switch (searchType) {
					case 'Books':
						try {
							response = await fetch(`/api/books/search?q=${encodeURIComponent(query)}&maxResults=10&forceFresh=true`);
						} catch {
							// Network error (connection failed, CORS, etc.)
							throw new Error(`Network error: Unable to connect to search API. Please check your connection.`);
						}
						
						if (!response.ok) {
							let errorMessage = `Failed to search books`;
							try {
								const errorData = await response.json();
								errorMessage = errorData?.error || errorData?.details || `Failed to search books (${response.status})`;
							} catch {
								errorMessage = response.statusText || `Failed to search books (${response.status})`;
							}
							throw new Error(errorMessage);
						}
						
						try {
							result = await response.json();
						} catch {
							throw new Error(`Invalid response from search API. Please try again.`);
						}
						// Handle both Google Books format (result.items) and database format (result.books)
						if ('items' in result && result.items && Array.isArray(result.items)) {
							const books: BookSearchResultWithRaw[] = result.items.map((item: BookSearchItem) => ({
								id: item.id,
								title: item.volumeInfo?.title || 'Unknown Title',
								authors: item.volumeInfo?.authors || [],
								description: item.volumeInfo?.description || '',
								imageLinks: item.volumeInfo?.imageLinks || {},
								// Store full item for favorite mode
								_raw: item,
							}));
							setBookResults(books);
							setUserResults([]);
						} else if ('books' in result && result.books && Array.isArray(result.books)) {
							// Database format
							const books: BookSearchResultWithRaw[] = result.books.map((item: BookSearchItem) => ({
								id: item._id?.toString() || item.id || '',
								title: item.volumeInfo?.title || item.title || 'Unknown Title',
								authors: item.volumeInfo?.authors || item.authors || [],
								description: item.volumeInfo?.description || item.description || '',
								imageLinks: item.volumeInfo?.imageLinks || item.imageLinks || {},
								// Store full item for favorite mode
								_raw: item,
							}));
							setBookResults(books);
							setUserResults([]);
						} else {
							setBookResults([]);
						}
						break;

					case 'User':
						try {
							response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=10`);
						} catch {
							throw new Error(`Network error: Unable to connect to search API. Please check your connection.`);
						}
						
						if (!response.ok) {
							let errorMessage = `Failed to search users (${response.status})`;
							try {
								const errorData = await response.json();
								errorMessage = errorData?.error || errorData?.details || errorMessage;
							} catch {
								errorMessage = response.statusText || errorMessage;
							}
							throw new Error(errorMessage);
						}
						
						try {
							result = await response.json();
						} catch {
							throw new Error(`Invalid response from search API. Please try again.`);
						}
						if ('users' in result && result.users && Array.isArray(result.users)) {
							setUserResults(result.users);
							setBookResults([]);
						} else {
							setUserResults([]);
						}
						break;

					case 'Vibe': {
						let vibeResponse: Response;
						try {
							vibeResponse = await fetch('/api/books/vibe-search', {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({ query: query.trim(), limit: 10 }),
							});
						} catch {
							throw new Error('Network error: Unable to connect to vibe search.');
						}

						if (!vibeResponse.ok) {
							throw new Error(`Vibe search unavailable (${vibeResponse.status})`);
						}

						const vibeData = await vibeResponse.json();
						if (vibeData?.items && Array.isArray(vibeData.items)) {
							const books: VibeSearchItem[] = vibeData.items.map((item: {
								id: string;
								volumeInfo?: { title?: string; authors?: string[]; description?: string; imageLinks?: { thumbnail?: string; smallThumbnail?: string } };
								matchReason?: string;
								similarityScore?: number;
								slug?: string;
							}) => ({
								id: item.id,
								title: item.volumeInfo?.title || 'Unknown Title',
								authors: item.volumeInfo?.authors || [],
								description: item.volumeInfo?.description || '',
								imageLinks: item.volumeInfo?.imageLinks || {},
								matchReason: item.matchReason,
								similarityScore: item.similarityScore,
							}));
							setVibeResults(books);
							setVibePersonalised(!!vibeData.personalised);
							setBookResults([]);
							setUserResults([]);
						} else {
							setVibeResults([]);
						}
						break;
					}
				}
			} catch (error) {
				console.error('Search error:', error);
				const errorMessage = error instanceof Error 
					? error.message 
					: `Failed to search ${searchType.toLowerCase()}`;
				// Set error message to be displayed in the UI
				setSearchError(errorMessage);
				// Clear all results on error
				setBookResults([]);
				setUserResults([]);
			} finally {
				setIsSearching(false);
			}
		}, debounceMs);

		return () => clearTimeout(timeoutId);
	}, [query, searchType]);

	const currentResults =
		searchType === 'Books' ? bookResults :
		searchType === 'Vibe' ? vibeResults :
		userResults;

	return (
		<Modal open={open} onOpenChange={setOpen}>
			<ModalTrigger asChild>{children}</ModalTrigger>
			<ModalContent
				className="p-0 max-w-xl w-full overflow-hidden"
				popoverProps={{ className: "max-w-xl" }}
			>
				<ModalTitle className="sr-only">Search</ModalTitle>
				<Command
					className={cn(
						"overflow-hidden rounded-xl bg-background",
						"[&_[cmdk-input-wrapper]]:border-0 [&_[cmdk-input-wrapper]]:p-0 [&_[cmdk-input-wrapper]]:flex-1",
						"[&_[cmdk-input-wrapper]_svg]:hidden"
					)}
					shouldFilter={false}
				>
					<div className={cn("px-4 pt-4 pb-3.5 transition-colors duration-200", searchType === 'Vibe' && "bg-amber-500/[0.025] dark:bg-amber-500/[0.04]")}>
						<div className="flex items-center gap-2.5">
							{searchType === 'Vibe'
								? <Wand2 className="size-4 shrink-0 text-amber-500/60" />
								: <SearchIcon className="size-4 shrink-0 text-muted-foreground/60" />
							}
							<CommandInput
								className="h-9 w-full bg-transparent text-sm placeholder:text-muted-foreground/60"
								placeholder={
									searchType === 'User' ? 'Search readers...' :
									searchType === 'Vibe' ? 'Describe a mood, theme, or feeling...' :
									'Search books & authors...'
								}
								value={query}
								onValueChange={(value) => {
									setQuery(value);
									if (searchError) setSearchError(null);
								}}
							/>
							{!query && (
								<kbd className="hidden sm:inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground/50">
									⌘K
								</kbd>
							)}
						</div>
						<div className="mt-3 flex items-center gap-1">
							{(['Books', 'User', ...(favoriteMode ? [] : ['Vibe'])] as SearchType[]).map((type) => (
								<button
									key={type}
									type="button"
									onClick={() => {
										setSearchType(type);
										setQuery('');
										setVibeResults([]);
										setVibePersonalised(false);
									}}
									className={cn(
										'cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150',
										searchType === type
											? type === 'Vibe'
												? 'bg-amber-500/12 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20'
												: 'bg-foreground text-background'
											: 'text-muted-foreground hover:bg-muted hover:text-foreground'
									)}
								>
									{type === 'User' ? 'Readers' : type === 'Vibe' ? (
										<span className="flex items-center gap-1">
											<Sparkles className="size-3" />
											Vibe
										</span>
									) : 'Books'}
								</button>
							))}
						</div>
					</div>

					<div className="h-px bg-border" />

					<CommandList className="scrollbar-hide min-h-[320px] max-h-[360px] overflow-y-auto">
						{query.trim() ? (
							<>
								{isSearching ? (
									<div className="flex min-h-[280px] flex-col items-center justify-center gap-4">
										<div
											className="pbld-bookmark"
											style={{ '--w': '72px' } as React.CSSProperties}
										>
											<div className="pbld-bookmark__pages" />
											<div className="pbld-bookmark__cover-l" />
											<div className="pbld-bookmark__cover-r" />
											<div className="pbld-bookmark__ribbon" />
										</div>
										<p className="text-xs uppercase tracking-widest text-muted-foreground">
											{searchType === 'Vibe' ? 'Finding your vibe...' : `Searching ${searchType === 'User' ? 'readers' : 'books'}`}
										</p>
									</div>
								) : searchError ? (
									<CommandEmpty className="flex min-h-[280px] flex-col items-center justify-center px-8 text-center">
										<SearchIcon className="mb-3 size-6 text-muted-foreground/30" />
										<p className="mb-1 text-sm font-medium">Search failed</p>
										<p className="mb-4 text-xs text-muted-foreground">{searchError}</p>
										<button
											type="button"
											onClick={() => setQuery('')}
											className="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
										>
											Clear search
										</button>
									</CommandEmpty>
								) : searchType === 'Vibe' && query.trim().length < 10 ? (
									<div className="flex min-h-[280px] flex-col items-center justify-center gap-3 px-8 text-center">
										<div className="flex items-center gap-1">
											{Array.from({ length: 10 }).map((_, i) => (
												<div
													key={i}
													className={cn(
														"h-1 w-1 rounded-full transition-colors duration-150",
														i < query.trim().length
															? "bg-amber-500/60"
															: "bg-muted-foreground/20"
													)}
												/>
											))}
										</div>
										<p className="text-xs text-muted-foreground/60">A bit more to activate vibe search</p>
									</div>
								) : currentResults.length === 0 ? (
									<CommandEmpty className="flex min-h-[280px] flex-col items-center justify-center px-8 text-center">
										<p className="mb-1 text-sm font-medium text-foreground/60">
											No {searchType === 'User' ? 'readers' : 'books'} found
										</p>
										<p className="text-xs text-muted-foreground">
											No results for &ldquo;{query}&rdquo;
										</p>
									</CommandEmpty>
								) : (
									<CommandGroup className="px-2 py-2">
										{searchType === 'Vibe' && vibePersonalised && (
											<div className="mb-2 flex items-center gap-1.5 px-1">
												<Sparkles className="size-3 text-amber-500/50" />
												<p className="text-[10px] text-amber-600/50 dark:text-amber-400/40 italic">
													Tuned to your reading taste
												</p>
											</div>
										)}
										{searchType === 'Vibe' && vibeResults.map((book, index) => {
											const cover = book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail || '';
											const authors = book.authors?.join(', ') || 'Unknown Author';
											const handleSelect = () => {
												if (book.id) {
													const isISBN = /^(\d{10}|\d{13})$/.test(book.id);
													const isValidId = /^[a-zA-Z0-9_-]+$/.test(book.id) && !book.id.includes(' ') && !book.id.includes('+');
													if (isISBN || isValidId) {
														router.push(`/b/${book.id}`);
													} else {
														router.push(`/b/${createBookSlug(book.title, book.id, book.id)}`);
													}
												} else {
													router.push(`/b/${createBookSlug(book.title)}`);
												}
												setOpen(false);
											};
											return (
												<CommandItem
													key={`vibe-${book.id}-${index}`}
													className="flex cursor-pointer flex-col items-start gap-0 rounded-lg px-3 py-2.5"
													value={`vibe-${book.id}-${book.title}`}
													onSelect={handleSelect}
													onClick={(e) => { e.stopPropagation(); handleSelect(); }}
												>
													<div className="flex w-full items-center gap-3">
														{cover ? (
															<div className="pointer-events-none relative h-[60px] w-10 flex-shrink-0 overflow-hidden rounded-[3px] bg-muted shadow-sm">
																<Image src={cover} alt={book.title} fill className="pointer-events-none object-cover" sizes="40px" quality={100} unoptimized={cover.includes('isbndb.com')} priority={false} />
															</div>
														) : (
															<div className="pointer-events-none flex h-[60px] w-10 flex-shrink-0 items-center justify-center rounded-[3px] bg-muted">
																<BookOpen className="size-4 text-muted-foreground/50" />
															</div>
														)}
														<div className="flex min-w-0 flex-1 flex-col">
															<p className="truncate text-sm font-medium leading-snug">{book.title}</p>
															<p className="mt-0.5 truncate text-xs text-muted-foreground">{authors}</p>
														</div>
													</div>
													{book.matchReason && (
														<p className="mt-1.5 px-[52px] text-[11px] leading-snug text-amber-600/70 dark:text-amber-400/60">
															{book.matchReason}
														</p>
													)}
												</CommandItem>
											);
										})}
										{searchType === 'Books' && bookResults.map((book, index) => {
											const cover = book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail || '';
											const authors = book.authors?.join(', ') || 'Unknown Author';

											const handleBookSelect = () => {
												if (favoriteMode) {
													const bookWithRaw = book as BookSearchResultWithRaw;
													const rawBook = bookWithRaw._raw || book;
													const isAlreadyAdded = favoriteMode.currentBooks.some(
														(id: string) => id === book.id || (typeof rawBook === 'object' && '_id' in rawBook && rawBook._id?.toString() === id)
													);
													if (!isAlreadyAdded && favoriteMode.currentBooks.length < favoriteMode.maxBooks) {
														const event = new CustomEvent('favorite-book-selected', { detail: rawBook });
														window.dispatchEvent(event);
														setOpen(false);
													}
													return;
												}
												if (book.id) {
													const isISBN = /^(\d{10}|\d{13})$/.test(book.id);
													const isOpenLibraryId = book.id.startsWith("OL") || book.id.startsWith("/works/");
													const isValidId = /^[a-zA-Z0-9_-]+$/.test(book.id) && !book.id.includes(" ") && !book.id.includes("+");
													if (isISBN || isOpenLibraryId || isValidId) {
														router.push(`/b/${book.id}`);
													} else {
														const slug = createBookSlug(book.title, book.id, book.id);
														router.push(`/b/${slug}`);
													}
												} else {
													const slug = createBookSlug(book.title);
													router.push(`/b/${slug}`);
												}
												setOpen(false);
											};

											const handleClick = (e: React.MouseEvent) => {
												e.stopPropagation();
												handleBookSelect();
											};

											const uniqueKey = book.id ? `${book.id}-${index}` : `book-${index}-${book.title}`;

											return (
												<CommandItem
													key={uniqueKey}
													className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5"
													value={`${book.id}-${book.title}`}
													onSelect={handleBookSelect}
													onClick={handleClick}
												>
													{cover ? (
														<div className="pointer-events-none relative h-[60px] w-10 flex-shrink-0 overflow-hidden rounded-[3px] bg-muted shadow-sm">
															<Image
																src={cover}
																alt={book.title}
																fill
																className="pointer-events-none object-cover"
																sizes="40px"
																quality={100}
																unoptimized={
																	cover.includes('isbndb.com') ||
																	cover.includes('images.isbndb.com') ||
																	cover.includes('covers.isbndb.com')
																}
																priority={false}
															/>
														</div>
													) : (
														<div className="pointer-events-none flex h-[60px] w-10 flex-shrink-0 items-center justify-center rounded-[3px] bg-muted">
															<BookOpen className="size-4 text-muted-foreground/50" />
														</div>
													)}
													<div className="flex min-w-0 flex-1 flex-col">
														<p className="truncate text-sm font-medium leading-snug">{book.title}</p>
														<p className="mt-0.5 truncate text-xs text-muted-foreground">{authors}</p>
													</div>
												</CommandItem>
											);
										})}
										{searchType === 'User' && userResults.map((user, index) => {
											const handleUserSelect = () => {
												router.push(`/u/${encodeURIComponent(user.username)}`);
												setOpen(false);
											};
											const handleClick = (e: React.MouseEvent) => {
												e.stopPropagation();
												handleUserSelect();
											};
											const uniqueKey = user.id ? `${user.id}-${index}` : `user-${index}-${user.username}`;

											return (
												<CommandItem
													key={uniqueKey}
													className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5"
													value={`${user.id}-${user.username}`}
													onSelect={handleUserSelect}
													onClick={handleClick}
												>
													<div className="pointer-events-none relative size-10 flex-shrink-0 overflow-hidden rounded-full bg-muted">
														<Image
															src={user.avatar || DEFAULT_AVATAR}
															alt={user.username}
															fill
															className="pointer-events-none object-cover"
															sizes="40px"
														/>
													</div>
													<div className="flex min-w-0 flex-1 flex-col">
														<p className="truncate text-sm font-medium">{user.username}</p>
														<p className="mt-0.5 truncate text-xs text-muted-foreground">{user.name}</p>
													</div>
												</CommandItem>
											);
										})}
									</CommandGroup>
								)}
							</>
						) : searchType === 'Vibe' ? (
							<div className="px-4 py-5">
								<p className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground/40">Try a feeling</p>
								<div className="grid grid-cols-2 gap-2">
									{VIBE_PROMPTS.map((prompt) => (
										<button
											key={prompt}
											type="button"
											onClick={() => setQuery(prompt)}
											className="rounded-lg bg-muted/50 px-3 py-2.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
										>
											{prompt}
										</button>
									))}
								</div>
							</div>
						) : (
							<div className="flex min-h-[280px] flex-col items-center justify-center gap-3 px-4 text-center">
								<div
									className="pbld-pageflip opacity-30"
									style={{ '--w': '36px', '--h': '44px' } as React.CSSProperties}
								>
									<div className="pbld-pageflip__left" />
									<div className="pbld-pageflip__right" />
									<div className="pbld-pageflip__spine" />
									<div className="pbld-pageflip__page" />
								</div>
								<p className="text-xs text-muted-foreground">
									{searchType === 'User'
										? 'Find readers by username'
										: 'Search by title, author, or ISBN'}
								</p>
							</div>
						)}
					</CommandList>

					{query.trim() && !isSearching && currentResults.length > 0 && (
						<div className="border-t border-border/50 px-4 py-2">
							<p className="text-[10px] text-muted-foreground/40">
								↑↓ navigate &middot; ↵ select &middot; esc close
							</p>
						</div>
					)}
				</Command>
			</ModalContent>
		</Modal>
	);
}