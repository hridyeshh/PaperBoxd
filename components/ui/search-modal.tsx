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

import { LucideIcon, SearchIcon, Loader2, BookOpen, User, BookMarked } from 'lucide-react';
import { cn } from '@/lib/utils';

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

type AuthorSearchResult = {
	id: string;
	name: string;
	cover?: string;
};

type UserSearchResult = {
	id: string;
	username: string;
	name: string;
	avatar?: string;
};

type SearchType = 'Books' | 'Author' | 'User';

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
	const [authorResults, setAuthorResults] = React.useState<AuthorSearchResult[]>([]);
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
			setAuthorResults([]);
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
						response = await fetch(`/api/books/search?q=${encodeURIComponent(query)}&maxResults=10`);
						if (!response.ok) {
							let errorMessage = `Failed to search books (${response.status})`;
							try {
								const errorData = await response.json();
								errorMessage = errorData?.error || errorData?.details || errorMessage;
							} catch {
								errorMessage = response.statusText || errorMessage;
							}
							throw new Error(errorMessage);
						}
						result = await response.json();
						if (result.items && Array.isArray(result.items)) {
							const books: BookSearchResult[] = result.items.map((item: any) => ({
								id: item.id,
								title: item.volumeInfo?.title || 'Unknown Title',
								authors: item.volumeInfo?.authors || [],
								description: item.volumeInfo?.description || '',
								imageLinks: item.volumeInfo?.imageLinks || {},
							}));
							setBookResults(books);
							setAuthorResults([]);
							setUserResults([]);
						} else {
							setBookResults([]);
						}
						break;

					case 'Author':
						response = await fetch(`/api/authors/search?q=${encodeURIComponent(query)}&limit=10`);
						if (!response.ok) {
							let errorMessage = `Failed to search authors (${response.status})`;
							try {
								const errorData = await response.json();
								errorMessage = errorData?.error || errorData?.details || errorMessage;
							} catch {
								errorMessage = response.statusText || errorMessage;
							}
							throw new Error(errorMessage);
						}
						result = await response.json();
						if (result.authors && Array.isArray(result.authors)) {
							setAuthorResults(result.authors);
							setBookResults([]);
							setUserResults([]);
						} else {
							setAuthorResults([]);
						}
						break;

					case 'User':
						response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=10`);
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
						result = await response.json();
						if (result.users && Array.isArray(result.users)) {
							setUserResults(result.users);
							setBookResults([]);
							setAuthorResults([]);
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
				setSearchError(errorMessage);
				setBookResults([]);
				setAuthorResults([]);
				setUserResults([]);
			} finally {
				setIsSearching(false);
			}
		}, 500); // 500ms debounce

		return () => clearTimeout(timeoutId);
	}, [query, searchType]);

	const currentResults = 
		searchType === 'Books' ? bookResults :
		searchType === 'Author' ? authorResults :
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
				<Command className="bg-background md:bg-card rounded-md md:border">
					<div className="flex flex-col gap-3 p-3 pb-2">
						<CommandInput
							className={cn(
								'placeholder:text-muted-foreground flex h-16 w-full rounded-md bg-transparent py-4 text-base outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
							)}
							placeholder={`Search ${searchType.toLowerCase()}...`}
							value={query}
							onValueChange={setQuery}
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
									label: 'Author',
									icon: BookMarked,
									isActive: searchType === 'Author',
									onClick: () => setSearchType('Author'),
								},
								{
									label: 'User',
									icon: User,
									isActive: searchType === 'User',
									onClick: () => setSearchType('User'),
								},
							]}
							className="w-full flex justify-between"
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
										{searchType === 'Books' && bookResults.map((book) => {
											const cover = book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail || '';
											const authors = book.authors?.join(', ') || 'Unknown Author';
											
											return (
												<CommandItem
													key={book.id}
													className="flex cursor-pointer items-center gap-3"
													value={book.title}
													onSelect={() => {
														// TODO: Navigate to book detail page or add to collection
														setOpen(false);
													}}
												>
													{cover ? (
														<div className="relative size-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
															<Image
																src={cover}
																alt={book.title}
																fill
																className="object-cover"
																sizes="48px"
															/>
														</div>
													) : (
														<div className="flex size-12 flex-shrink-0 items-center justify-center rounded-md bg-muted">
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
										{searchType === 'Author' && authorResults.map((author) => (
											<CommandItem
												key={author.id}
												className="flex cursor-pointer items-center gap-3"
												value={author.name}
												onSelect={() => {
													// TODO: Navigate to author page
													setOpen(false);
												}}
											>
												{author.cover ? (
													<div className="relative size-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
														<Image
															src={author.cover}
															alt={author.name}
															fill
															className="object-cover"
															sizes="48px"
														/>
													</div>
												) : (
													<div className="flex size-12 flex-shrink-0 items-center justify-center rounded-md bg-muted">
														<BookMarked className="size-5 text-muted-foreground" />
													</div>
												)}
												<div className="flex flex-1 flex-col min-w-0">
													<p className="max-w-[250px] truncate text-sm font-medium">
														{author.name}
													</p>
													<p className="text-muted-foreground text-xs truncate">
														Author
													</p>
												</div>
											</CommandItem>
										))}
										{searchType === 'User' && userResults.map((user) => (
											<CommandItem
												key={user.id}
												className="flex cursor-pointer items-center gap-3"
												value={user.username}
												onSelect={() => {
													router.push(`/u/${encodeURIComponent(user.username)}`);
													setOpen(false);
												}}
											>
												<div className="relative size-12 flex-shrink-0 overflow-hidden rounded-full bg-muted">
													<Image
														src={user.avatar || defaultAvatar}
														alt={user.username}
														fill
														className="object-cover"
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
										))}
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