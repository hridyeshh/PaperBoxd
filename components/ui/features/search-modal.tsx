import { API_BASE_URL } from '@/lib/api/client';
import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
	Modal,
	ModalContent,
	ModalTitle,
	ModalTrigger,
} from '@/components/ui/primitives/modal';
import { Button } from '@/components/ui/primitives/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/primitives/command';
import { DockToggle } from '@/components/ui/dock';

import { LucideIcon, SearchIcon, Loader2, BookOpen, User } from 'lucide-react';
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

type SearchType = 'Books' | 'User';

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


export function SearchModal({ children }: SearchModalProps) {
	const router = useRouter();
	const [open, setOpen] = React.useState(false);
	const [query, setQuery] = React.useState('');
	const [searchType, setSearchType] = React.useState<SearchType>('Books');
	const [bookResults, setBookResults] = React.useState<BookSearchResult[]>([]);
	const [userResults, setUserResults] = React.useState<UserSearchResult[]>([]);
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
		}
	}, [open]);

	// Debounced search based on search type
	React.useEffect(() => {
		if (!query.trim()) {
			setBookResults([]);
			setUserResults([]);
			setSearchError(null);
			return;
		}

		const timeoutId = setTimeout(async () => {
			setIsSearching(true);
			setSearchError(null);
			
			try {
				let response: Response;
				let result: SearchResponse;

				switch (searchType) {
					case 'Books':
						try {
							response = await fetch(`${API_BASE_URL}/api/books/search?q=${encodeURIComponent(query)}&maxResults=10&forceFresh=true`);
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
							response = await fetch(`${API_BASE_URL}/api/users/search?q=${encodeURIComponent(query)}&limit=10`);
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
		}, 300); // 300ms debounce for better real-time feel

		return () => clearTimeout(timeoutId);
	}, [query, searchType]);

	const currentResults = 
		searchType === 'Books' ? bookResults :
		userResults;

	return (
		<Modal open={open} onOpenChange={setOpen}>
			<ModalTrigger asChild>{children}</ModalTrigger>
			<ModalContent 
				className="p-1 max-w-2xl w-full" 
				popoverProps={{ className: "max-w-2xl" }}
			>
				<ModalTitle className="sr-only">Search</ModalTitle>
				<Command className="bg-background md:bg-card rounded-md md:border" shouldFilter={false}>
					<div className="flex flex-col gap-3 p-3 pb-2">
						<CommandInput
							className={cn(
								'placeholder:text-muted-foreground flex h-16 w-full rounded-md bg-transparent py-4 text-base outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
							)}
							placeholder={`Search ${searchType.toLowerCase()}...`}
							value={query}
							onValueChange={(value) => {
								setQuery(value);
								// Clear error when user starts typing again
								if (searchError) {
									setSearchError(null);
								}
							}}
						/>
						<DockToggle
							items={[
								{
									label: 'Books',
									icon: BookOpen,
									isActive: searchType === 'Books',
									onClick: () => setSearchType('Books'),
								},
								{
									label: 'User',
									icon: User,
									isActive: searchType === 'User',
									onClick: () => setSearchType('User'),
								},
							]}
							className="w-full flex justify-between"
							buttonClassName="justify-center"
						/>
					</div>
					<CommandList className="max-h-[380px] min-h-[380px] px-2 md:px-0">
						{query.trim() ? (
							// Show search results based on type
							<>
								{isSearching ? (
									<div className="flex min-h-[280px] flex-col items-center justify-center">
										<Loader2 className="text-muted-foreground mb-2 size-6 animate-spin" />
										<p className="text-muted-foreground text-xs">Searching {searchType.toLowerCase()}...</p>
									</div>
								) : searchError ? (
									<CommandEmpty className="flex min-h-[280px] flex-col items-center justify-center">
										<SearchIcon className="text-muted-foreground mb-2 size-6" />
										<p className="text-muted-foreground mb-1 text-xs">
											{searchError}
										</p>
										<Button onClick={() => setQuery('')} variant="ghost">
											Clear search
										</Button>
									</CommandEmpty>
								) : currentResults.length === 0 ? (
									<CommandEmpty className="flex min-h-[280px] flex-col items-center justify-center">
										<SearchIcon className="text-muted-foreground mb-2 size-6" />
										<p className="text-muted-foreground mb-1 text-xs">
											No {searchType.toLowerCase()} found for &quot;{query}&quot;
										</p>
										<Button onClick={() => setQuery('')} variant="ghost">
											Clear search
										</Button>
									</CommandEmpty>
								) : (
									<CommandGroup>
										{searchType === 'Books' && bookResults.map((book, index) => {
											const cover = book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail || '';
											const authors = book.authors?.join(', ') || 'Unknown Author';
											
											const handleBookSelect = () => {
												// If in favorite mode, dispatch event instead of navigating
												if (favoriteMode) {
													const bookWithRaw = book as BookSearchResultWithRaw;
													const rawBook = bookWithRaw._raw || book;
													// Check if already added
													const isAlreadyAdded = favoriteMode.currentBooks.some(
														(id: string) => id === book.id || (typeof rawBook === 'object' && '_id' in rawBook && rawBook._id?.toString() === id)
													);
													if (!isAlreadyAdded && favoriteMode.currentBooks.length < favoriteMode.maxBooks) {
														// Dispatch event with full book data
														const event = new CustomEvent('favorite-book-selected', { detail: rawBook });
														window.dispatchEvent(event);
														setOpen(false);
													}
													return;
												}

												// Normal navigation behavior
												// Use the book ID directly if it's an ISBN or valid ID
												// Otherwise, create a slug from the title
												if (book.id) {
													// Check if book.id is an ISBN (10 or 13 digits)
													const isISBN = /^(\d{10}|\d{13})$/.test(book.id);
													// Check if it looks like an Open Library ID
													const isOpenLibraryId = book.id.startsWith("OL") || book.id.startsWith("/works/");
													// Check if it's a valid ID format (alphanumeric, no spaces, no +)
													const isValidId = /^[a-zA-Z0-9_-]+$/.test(book.id) && !book.id.includes(" ") && !book.id.includes("+");
													
													if (isISBN || isOpenLibraryId || isValidId) {
														// Use ID directly
														router.push(`/b/${book.id}`);
													} else {
														// Create slug if ID format is unexpected
														const slug = createBookSlug(book.title, book.id, book.id);
														router.push(`/b/${slug}`);
													}
												} else {
													// No ID, create slug from title
													const slug = createBookSlug(book.title);
													router.push(`/b/${slug}`);
												}
												setOpen(false);
											};
											
											const handleClick = (e: React.MouseEvent) => {
												e.stopPropagation();
												handleBookSelect();
											};
											
											// Create unique key: use book.id if available, otherwise use index with title
											const uniqueKey = book.id ? `${book.id}-${index}` : `book-${index}-${book.title}`;
											
											return (
												<CommandItem
													key={uniqueKey}
													className="flex cursor-pointer items-center gap-3"
													value={`${book.id}-${book.title}`}
													onSelect={handleBookSelect}
													onClick={handleClick}
												>
													{cover ? (
														<div className="relative size-14 flex-shrink-0 overflow-hidden rounded-md bg-muted pointer-events-none">
															<Image
																src={cover}
																alt={book.title}
																fill
																className="object-cover pointer-events-none"
																sizes="56px"
																quality={100}
																unoptimized={cover.includes('isbndb.com') || cover.includes('images.isbndb.com') || cover.includes('covers.isbndb.com')}
																priority={false}
															/>
														</div>
													) : (
														<div className="flex size-12 flex-shrink-0 items-center justify-center rounded-md bg-muted pointer-events-none">
															<BookOpen className="size-5 text-muted-foreground" />
														</div>
													)}
													<div className="flex flex-1 flex-col min-w-0">
														<p className="max-w-[250px] truncate text-sm font-medium">
															{book.title}
														</p>
														<p className="text-muted-foreground text-xs truncate">
															{authors}
														</p>
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
											
											// Create unique key: use user.id if available, otherwise use username with index
											const uniqueKey = user.id ? `${user.id}-${index}` : `user-${index}-${user.username}`;
											
											return (
												<CommandItem
													key={uniqueKey}
													className="flex cursor-pointer items-center gap-3"
													value={`${user.id}-${user.username}`}
													onSelect={handleUserSelect}
													onClick={handleClick}
												>
												<div className="relative size-12 flex-shrink-0 overflow-hidden rounded-full bg-muted pointer-events-none">
													<Image
														src={user.avatar || DEFAULT_AVATAR}
														alt={user.username}
														fill
														className="object-cover pointer-events-none"
														sizes="48px"
													/>
												</div>
												<div className="flex flex-1 flex-col min-w-0">
													<p className="max-w-[250px] truncate text-sm font-medium">
														{user.username}
													</p>
													<p className="text-muted-foreground text-xs truncate">
														{user.name}
													</p>
												</div>
											</CommandItem>
											);
										})}
									</CommandGroup>
								)}
							</>
						) : (
							// Show empty state when no search query
							<CommandEmpty className="flex min-h-[280px] flex-col items-center justify-center">
								<SearchIcon className="text-muted-foreground mb-2 size-6" />
								<p className="text-muted-foreground mb-1 text-xs">
									Search for {searchType.toLowerCase()} by typing above
								</p>
							</CommandEmpty>
						)}
					</CommandList>
				</Command>
			</ModalContent>
		</Modal>
	);
}