import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
	Modal,
	ModalContent,
	ModalTitle,
	ModalTrigger,
} from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import { DockToggle } from '@/components/ui/dock';

import { LucideIcon, SearchIcon, Loader2, BookOpen, User } from 'lucide-react';
import { cn } from '@/lib/utils';
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
	data: CommandItem[];
};


export function SearchModal({ children, data }: SearchModalProps) {
	const router = useRouter();
	const [open, setOpen] = React.useState(false);
	const [query, setQuery] = React.useState('');
	const [searchType, setSearchType] = React.useState<SearchType>('Books');
	const [bookResults, setBookResults] = React.useState<BookSearchResult[]>([]);
	const [userResults, setUserResults] = React.useState<UserSearchResult[]>([]);
	const [isSearching, setIsSearching] = React.useState(false);
	const [searchError, setSearchError] = React.useState<string | null>(null);

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
				let result: any;

				switch (searchType) {
					case 'Books':
						try {
							response = await fetch(`/api/books/search?q=${encodeURIComponent(query)}&maxResults=10`);
						} catch (fetchError) {
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
						} catch (parseError) {
							throw new Error(`Invalid response from search API. Please try again.`);
						}
						if (result.items && Array.isArray(result.items)) {
							const books: BookSearchResult[] = result.items.map((item: any) => ({
								id: item.id,
								title: item.volumeInfo?.title || 'Unknown Title',
								authors: item.volumeInfo?.authors || [],
								description: item.volumeInfo?.description || '',
								imageLinks: item.volumeInfo?.imageLinks || {},
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
						} catch (fetchError) {
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
						} catch (parseError) {
							throw new Error(`Invalid response from search API. Please try again.`);
						}
						if (result.users && Array.isArray(result.users)) {
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

	const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%239ca3af'/%3E%3Cpath d='M50 30c-8.284 0-15 6.716-15 15 0 5.989 3.501 11.148 8.535 13.526C37.514 62.951 32 70.16 32 78.5h36c0-8.34-5.514-15.549-13.535-19.974C59.499 56.148 63 50.989 63 45c0-8.284-6.716-15-15-15z' fill='white' opacity='0.8'/%3E%3C/svg%3E";

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
											No {searchType.toLowerCase()} found for "{query}"
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
														src={user.avatar || defaultAvatar}
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