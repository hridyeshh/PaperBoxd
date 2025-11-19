# PaperBoxd

> Your reading universe, organized.

A modern social book tracking platform that empowers readers to discover, track, and share their literary journey. PaperBoxd transforms reading into a connected, discoverable experience—inspired by the simplicity and community spirit of Letterboxd, but built exclusively for books.

---

## Purpose & Mission

### Vision

PaperBoxd was conceived to solve a fundamental problem: reading is a deeply personal yet inherently social activity, but existing platforms fragment the experience. Our mission is to create a unified space where readers can:

- **Track their journey**: From "to-be-read" aspirations to completed masterpieces
- **Discover meaningfully**: Through community curation and authentic recommendations
- **Express authentically**: With rich profiles, custom lists, and thoughtful reviews
- **Connect organically**: By following fellow readers and exploring their literary landscapes

### Core Philosophy

We believe that the best book recommendations come from people, not algorithms. PaperBoxd is designed around the principle that reading communities thrive when readers can express themselves, discover through trusted networks, and maintain control over their personal data and privacy.

---

## System Architecture

### High-Level Design

PaperBoxd follows a **modern full-stack architecture** optimized for performance, scalability, and developer experience:

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Next.js    │  │  React 19    │  │   Tailwind   │ │
│  │ App Router   │  │  Components  │  │      CSS     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                         ↕ RPC/HTTP
┌─────────────────────────────────────────────────────────┐
│                    Server Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Next.js    │  │  NextAuth    │  │   API Routes │ │
│  │   Server     │  │   Auth v5    │  │   Handlers   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                         ↕ ODM/Queries
┌─────────────────────────────────────────────────────────┐
│                    Data Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   MongoDB    │  │   Mongoose   │  │  Google Books│ │
│  │   Atlas      │  │   Models     │  │     API      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Architectural Principles

#### 1. **Server-First Rendering with Progressive Enhancement**

We leverage Next.js 15's App Router to prioritize server-side rendering for initial page loads, ensuring fast Time to First Byte (TTFB) and excellent SEO. Client-side interactivity is added progressively, creating a resilient experience that works even with JavaScript disabled for core navigation.

**Implementation**:
- Server Components by default for static content and data fetching
- Client Components (`"use client"`) only where interactivity is required
- Strategic use of `useState`, `useEffect` for dynamic features
- Server Actions for mutations (where applicable)

#### 2. **API-First Design Pattern**

All data operations flow through well-defined RESTful API routes (`/app/api/*`), creating a clear separation between presentation and business logic. This enables:

- **Type safety**: Shared TypeScript interfaces between client and server
- **Reusability**: API endpoints can be consumed by external services
- **Testability**: API routes can be tested independently
- **Future flexibility**: Easy migration to microservices if needed

**API Structure**:
```
/api/
├── users/
│   ├── [username]/         # User CRUD operations
│   ├── [username]/books    # User's book collections
│   ├── [username]/follow   # Follow/unfollow actions
│   ├── [username]/followers # Follower list
│   ├── [username]/following # Following list
│   ├── [username]/lists    # Custom reading lists (create, fetch)
│   ├── [username]/lists/[listId]/ # List operations (update, delete)
│   ├── [username]/lists/[listId]/share # Share list with followers
│   ├── [username]/lists/[listId]/save # Save/remove list
│   ├── [username]/lists/[listId]/access # Grant/revoke access to private lists
│   ├── [username]/activities/check-new # Check for new friend activities
│   ├── [username]/activities/following # Get activities from followed users
│   ├── register            # User registration
│   ├── search              # User search
│   └── check-username      # Username availability check
├── books/
│   ├── [id]/               # Book details (with caching)
│   ├── [id]/share          # Share book with followers
│   ├── search              # Book search (hybrid: DB + Google Books)
│   ├── public              # Public home page carousels (newly published, popular, trending)
│   ├── personalized        # Personalized carousels for authenticated users
│   └── by-author           # Books by a specific author
├── authors/
│   └── search              # Author search from book database
├── onboarding/
│   ├── status              # Check onboarding completion status
│   └── genres              # Get available genres for onboarding
├── recommendations/
│   ├── home                # Home page recommendations
│   ├── similar/[bookId]    # Books similar to a specific book
│   └── feedback            # Track recommendation interactions
├── events/
│   └── track               # Track user interaction events
├── newsletter/
│   └── subscribe           # Newsletter email subscription
└── auth/
    └── [...nextauth]/      # NextAuth authentication routes
```

#### 3. **Data Normalization with Strategic Caching**

We use a **hybrid caching strategy** to optimize performance and minimize external API calls:

- **Database-First for Book Search**: Search queries first check MongoDB for previously fetched books, reducing Google Books API calls by ~70-80%
- **Google Books as Fallback**: Only fetch from Google Books API when books aren't in our database
- **Automatic Caching**: Newly fetched books are immediately stored in MongoDB for future queries
- **Time-Based Invalidation**: Books not accessed in 15+ days are automatically cleaned up to manage storage within free tier limits

**Benefits**:
- Faster search results (database queries are ~10-50ms vs API calls at ~200-500ms)
- Reduced external API dependency
- Cost efficiency (staying within Google Books API quotas)
- Better user experience (consistent, instant results)

#### 4. **Authentication & Session Management**

We implement **NextAuth.js v5** with a dual authentication strategy:

**Credentials Provider**:
- Email/password authentication with bcrypt hashing
- Secure session management via JWT tokens
- Session cookies with size optimization (excluding large base64 images)

**Google OAuth Provider**:
- Optional OAuth 2.0 authentication for convenience
- Seamless account linking
- Maintains consistent user experience

**Session Strategy**:
- JWT-based sessions stored in HTTP-only cookies
- Session data includes minimal user info (username, email, avatar URL, not base64)
- Avatar images are stored separately in MongoDB to prevent cookie size issues
- Theme preferences stored in localStorage (client-side only)

#### 5. **Component Composition & Reusability**

We follow a **layered component architecture** that promotes reusability and maintainability:

**Layer 1: Primitives** (`components/ui/`)
- Unstyled, accessible components built on Radix UI primitives
- Examples: `Button`, `Dialog`, `Select`, `Checkbox`, `Avatar`
- Follow Shadcn UI patterns for consistency

**Layer 2: Composite Components** (`components/ui/`)
- Composed from primitives, but still domain-agnostic
- Examples: `SearchModal`, `ThemeToggle`, `DockToggle`, `Pagination`
- Handle complex interactions and state management

**Layer 3: Domain-Specific Components** (`components/ui/`)
- Built for specific features (auth, profile, books)
- Examples: `EditProfileForm`, `BookCarousel`, `FollowersFollowingDialog`
- Encapsulate business logic and data fetching

**Layer 4: Page Components** (`app/*`)
- Top-level page components that orchestrate feature components
- Handle routing, URL state, and page-level data fetching

**Design Patterns Used**:
- **Compound Components**: For complex UI like `DockToggle` with `GlassToggleButton`
- **Render Props**: For flexible composition (e.g., `GridList` with `GridListItem`)
- **Custom Hooks**: Extract reusable logic (e.g., `useIsMobile`, `useMediaQuery`)
- **Context API**: For theme and authentication state (via NextAuth)

#### 6. **Responsive Design & Accessibility**

**Mobile-First Approach**:
- All layouts designed for mobile screens first, enhanced for desktop
- Breakpoint system using Tailwind CSS (`sm:`, `md:`, `lg:`, `xl:`)
- Touch-friendly interactions (minimum 44x44px touch targets)
- Adaptive navigation (mobile: Sheet drawer, desktop: horizontal nav)

**Accessibility Standards**:
- ARIA labels and roles on all interactive elements
- Keyboard navigation support throughout
- Screen reader optimizations
- Semantic HTML structure
- Focus management in modals and dialogs
- Color contrast compliance (WCAG AA minimum)

**Implementation**:
- Radix UI primitives provide accessibility out-of-the-box
- Custom components follow ARIA patterns
- `react-aria-components` for advanced accessibility (e.g., `GridList`, `CheckboxGroup`)

---

## Design Principles

### 1. **Performance-First Development**

Every feature is evaluated against performance metrics:

- **Lazy Loading**: Components and images load only when needed
- **Code Splitting**: Automatic route-based code splitting via Next.js App Router
- **Image Optimization**: Next.js `Image` component with automatic WebP conversion
- **Debounced Search**: API calls debounced to prevent excessive requests
- **Session Storage Caching**: Client-side caching for profile data (30s TTL)
- **Database Indexing**: Strategic indexes on frequently queried fields (`username`, `email`, `bookshelf.bookId`, etc.)

**Performance Targets**:
- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.5s
- Cumulative Layout Shift (CLS): < 0.1

### 2. **Type Safety Throughout**

TypeScript is used end-to-end with strict mode enabled:

- **Shared Types**: Common interfaces defined in `lib/db/models/` for database schemas
- **API Route Types**: Request/response types for API endpoints
- **Component Props**: All props explicitly typed
- **Form Validation**: Zod schemas for runtime type checking and validation

**Benefits**:
- Catch errors at compile time, not runtime
- Better IDE autocomplete and refactoring
- Self-documenting code through types
- Confidence in refactoring

### 3. **State Management Philosophy**

We use a **hybrid state management approach**:

**Server State**:
- Managed by Next.js server components and API routes
- Fetched fresh on each request (or cached at CDN level)
- Session state via NextAuth

**Client State**:
- React `useState` for component-local state (UI toggles, form inputs)
- React `useEffect` for side effects (data fetching, subscriptions)
- `useMemo` and `useCallback` for performance optimization
- `sessionStorage` for temporary caching (profile data)

**No Global State Library Needed**:
- Next.js App Router handles most server state
- React Context (via NextAuth) handles auth state
- Prop drilling kept minimal through component composition
- Avoided complexity of Redux/Zustand for current scale

### 4. **Error Handling & Resilience**

**Graceful Degradation**:
- API errors display user-friendly messages (via toast notifications)
- Fallback UI for failed data fetches
- Network errors retry with exponential backoff (where applicable)

**Error Boundaries**:
- Next.js error boundaries catch rendering errors
- Custom error pages (`app/not-found.tsx`, `app/error.tsx`)
- API routes return structured error responses

**Validation**:
- Client-side validation (react-hook-form + Zod)
- Server-side validation (API route handlers)
- Database schema validation (Mongoose validators)

### 5. **Security Best Practices**

**Authentication & Authorization**:
- Password hashing with bcryptjs (10 rounds)
- JWT tokens signed with secure secret (32+ bytes)
- HTTP-only cookies for session storage
- CSRF protection via NextAuth

**Data Protection**:
- Input sanitization on all user inputs
- SQL injection prevention (using parameterized queries via Mongoose)
- XSS prevention (React automatically escapes)
- Rate limiting consideration (future: API rate limiting middleware)

**Privacy**:
- User data stored securely in MongoDB Atlas (encrypted at rest)
- Avatar images stored separately (not in session cookies)
- **Private Lists**: Users can create private lists that are only visible to:
  - The list owner
  - Users explicitly granted access by the owner
  - Access is managed through username-based access control
- Public/private profile toggle (currently all public, architecture supports private)
- GDPR-ready architecture (users can request data deletion)

### 6. **Scalability Considerations**

**Database Design**:
- Normalized schemas for efficient queries
- Indexed fields for fast lookups
- Embedded documents for frequently accessed data (e.g., `bookshelf` array in User)
- Automatic cleanup of stale data to manage storage

**API Design**:
- RESTful endpoints for predictable patterns
- Pagination support (3x4 grid = 12 items per page)
- Efficient queries (`.lean()` for read-only operations)
- Caching strategies to reduce database load

**Frontend Scalability**:
- Component composition enables easy feature additions
- Modular API structure supports feature expansion
- Code splitting ensures bundle size stays manageable
- Future: Consider GraphQL if API complexity grows

---

## Technical Stack

### Core Framework & Runtime
- **Next.js 15** (App Router) - Server-side rendering, API routes, file-based routing
- **React 19** - UI library with concurrent features
- **TypeScript 5** - Type-safe development

### Styling & UI
- **Tailwind CSS 4** - Utility-first CSS framework
- **Radix UI** - Accessible, unstyled component primitives
- **Framer Motion** - Animation library for smooth transitions
- **Lucide React** - Icon library
- **class-variance-authority** - Variant management for components
- **Adobe Fonts** - Custom typography (CoFo Glassier, Helvetica, El Paso, Brooklyn Heritage Script)

### Data & Authentication
- **MongoDB Atlas** - Cloud database (free tier: 512MB)
- **Mongoose 8** - MongoDB ODM with TypeScript support
- **NextAuth.js v5** - Authentication framework
- **bcryptjs** - Password hashing

### Forms & Validation
- **react-hook-form** - Form state management
- **Zod** - Schema validation and type inference
- **@hookform/resolvers** - Zod integration for react-hook-form

### Utilities
- **date-fns** - Date formatting and manipulation
- **sonner** - Toast notifications
- **cmdk** - Command palette component
- **react-aria-components** - Advanced accessibility components
- **react-day-picker** - Date picker component
- **@tiptap/react** - Rich text editor with full formatting capabilities
- **@tiptap/starter-kit** - Essential Tiptap extensions
- **@tiptap/extension-*** - Additional Tiptap extensions (underline, link, text-align, highlight, subscript, superscript)

### External APIs
- **Google Books API** - Book metadata and search
- **ISBNdb API** - Additional book metadata and search
- **Open Library API** - Book metadata fallback

---

## Key Features & Implementation

### User Profiles

**Dynamic Routing**: `/u/[username]` enables unique user profile URLs. The route fetches user data server-side for SEO and initial load performance.

**Profile Sections**:
- **Profile Summary**: Avatar, username, name, bio, pronouns, follower/following counts
- **Dock Navigation**: Tabs for Bookshelf, Diary, Authors, Lists, To-Be-Read, Likes
- **Owner-Specific Content**: "Your Library, organised" (owner) vs "{username}'s library" (others) with custom CoFo Glassier font
- **Edit Profile**: Side sheet modal with comprehensive form (username, bio, gender, pronouns, birthday, links)
- **Profile Link Sharing**: Copy profile link to clipboard from header dropdown menu

**Consistent Grid Layouts & Pagination**:
- **Bookshelf**: 3-column grid with pagination, clickable books that navigate to book detail pages
- **Diary**: 3x5 grid (15 entries per page) with pagination, no cover images, clean entry display
- **Authors**: 3-column grid with pagination, each card displays a 3-book cover grid (with gray placeholders for missing books), clickable to open author dialog
- **Lists**: 3-column grid with pagination, each list card shows a 3-book cover grid (with gray placeholders), clickable to navigate to list detail page
- **To-Be-Read**: Same 3-column grid design as Bookshelf, clickable books
- **Likes**: Same 3-column grid design as Bookshelf, clickable books

**Data Fetching**:
- Server-side fetch for initial load (SEO-friendly)
- Client-side caching via `sessionStorage` (30s TTL) for instant navigation
- Real-time updates after profile edits

### Book Management

**Collections**:
- **Bookshelf**: Books marked as "read" (3-column grid with pagination, sorted by most recently finished, clickable to navigate to book detail pages)
- **Likes**: Books marked as "liked" (3-column grid with pagination, clickable to navigate to book detail pages)
- **To-Be-Read**: Books marked as "pending" (3-column grid with pagination, labeled "The procrastination wall", clickable to navigate to book detail pages)
- **Diary**: Reading diary entries (3x5 grid, 15 entries per page, clean display without cover images)

**Search Integration**:
- Hybrid search: MongoDB database first, Google Books API fallback
- Debounced input (300ms delay) to reduce API calls
- Category filtering: Books, Users (author search removed)
- Cached results for instant subsequent searches

**Book Data Model**:
- Normalized storage: Books stored once, referenced by `ObjectId` in user collections
- Google Books API data cached in MongoDB
- Automatic cleanup of unused books (15+ days inactive)
- Deduplication: Carousels ensure unique books (no duplicate editions)

**Book Discovery**:
- **Home Page Carousels**: 
  - Public users: "Newly Published This Week", "People Love These", "Trending Now"
  - Authenticated users: Personalized carousels based on preferences, favorites, authors, genres, and friend activity
- **Book Detail Page** (`/b/[slug]`): 
  - Enhanced description with timeline card styling and Helvetica font
  - "Similar to [book]" and "More from [author]" carousels
  - "Write about it" button with rich text editor for book-specific diary entries
  - Share book functionality with followers
  - Clean button styling (no borders) for Bookshelf, Like, and TBR actions
- **Feed Page** (`/feed`): Main book discovery feed (renamed from `/books`)
- **Recommendation System**: Sophisticated rule-based engine with multi-signal learning, friend-based recommendations, and diversity injection

### Social Features

**Follow System**:
- One-way following (asymmetric, like Twitter)
- Follower/following counts displayed on profiles
- Clickable counts open dialog showing user lists
- Follow/unfollow button on other users' profiles
- Share lists directly with followers via share modal

**Author Discovery**:
- **Author Section**: Displays all authors from user's bookshelf in a 3-column grid
- **Author Cards**: Show 3-book cover grid (with gray placeholders), author name, and read/TBR counts
- **Author Dialog**: Clicking an author opens a dialog (not a separate page) showing:
  - Author name as header
  - All books read by that author from the user's bookshelf
  - Responsive grid layout (2-6 columns based on screen size)
  - Clickable book covers that navigate to book detail pages

**Activity Feed**:
- Dedicated `/activity` page for logged-in user's activity
- Tracks book additions, list creations, profile updates, list shares, book shares, and granted access notifications
- Filterable by "Friends" and "Me"
- Real-time activity indicator in header ("Updates" button) when new friend activities are available
- Activity format: `[username] [action] [bookname]` for clear readability
- Clickable activities that navigate to relevant content (e.g., shared lists, shared books, granted access lists)
- **Activity Types**:
  - `shared_list`: When a follower shares a list with you
  - `shared_book`: When a follower shares a book with you
  - `granted_access`: When someone grants you access to their private list

**Reading Lists**:
- **List Creation**: Pinterest-style modal for creating new lists with title, description, and privacy options
  - **Private Lists**: "Make this list secret" toggle - only people with the shared link can see it
  - **Access Management**: For private lists, owners can grant access to specific users by username
- **List Detail Pages**: Full-featured list pages (`/u/[username]/lists/[listId]`) with:
  - Book search modal for adding books to lists
  - Book removal functionality (cross button on hover over book covers)
  - **Public Lists**: Share functionality with followers and social media options
  - **Private Lists**: "Manage Access" dialog to grant/revoke access to specific users
  - Save/Remove list functionality for other users (toggles between "Save list" and "Remove" buttons)
  - Edit details and delete list options (for list owners only)
  - Private list access control: Non-owners see "This list is private" message if not granted access
- **List Cards**: 3-column grid layout in profile dock, each card displays:
  - 3-book cover grid (with gray placeholders if fewer than 3 books)
  - List title, description, book count, and last updated timestamp
  - Clickable to navigate to list detail page
- **List Sharing & Access**:
  - **Public Lists**: Share lists with specific followers via share modal
  - **Private Lists**: Grant access to specific users by username (not traditional sharing)
  - Shared lists and granted access appear as notifications in recipient's "Updates" section
  - Recipients can save shared lists to their own profile
  - Saved lists retain original creator's username (displayed as clickable `@username`)
- **List Management**:
  - Edit list details (title, description, privacy settings) via dropdown menu
  - Delete lists with confirmation (removes from owner and all saved instances)
  - View-only access for saved lists (no editing permissions)
  - Access management for private lists (grant/revoke access to specific users)

### Recommendation System

**Sophisticated Rule-Based Engine**:
- Multi-signal learning from user interactions (ratings, likes, reads, searches)
- Friend-based recommendations ("Your friends are liking these")
- Genre and author matching based on user preferences
- Diversity injection using Maximal Marginal Relevance (MMR)
- Context-aware recommendations (time of day, reading velocity)
- Explainable reasons for each recommendation
- Caching with TTL for performance
- A/B testing framework for algorithm variants

**User Profile Building**:
- Automatic preference computation from reading history
- Genre weights and author weights
- Reading velocity tracking
- Diversity score calculation
- Profile recomputation on significant actions

**Recommendation Types**:
- Personalized home page carousels
- Similar books (based on genre and author)
- Books by same author
- Friend activity-based recommendations
- Trending books in user's preferred genres

### Home Page Experience

**Public Home Page**:
- Hero section with PaperBoxd branding
- Diverse book carousels showcasing different genres
- "Newly Published This Week" carousel
- "People Love These" carousel
- "Trending Now" carousel
- Footer with newsletter subscription, quick links, and legal information

**Authenticated Home Page**:
- Personalized hero section (no "Start saving" button)
- Personalized carousels:
  - "Recommended for You"
  - "Your Friends Are Liking These" (only shown if 5+ books available)
  - "Based on Your Favorites"
  - "From Your Favorite Authors"
  - "Trending in Your Genres"
  - "Continue Reading"
- Footer with newsletter subscription and legal information

**Loading States**:
- Tetris loader for consistent loading experience
- Single load per page visit (prevents re-fetching on re-renders)
- Optimized data fetching with parallel API calls

### Legal & Compliance

**Footer Components**:
- Newsletter subscription (email saved to database)
- Quick links (Home, About Us, Discover Books, Contact)
- Social media links (Twitter, Instagram, LinkedIn)
- Legal links with dialog modals:
  - **Privacy Policy**: Comprehensive privacy policy dialog
  - **Terms of Service**: Terms of service dialog
  - **Cookie Settings**: Cookie preferences dialog (only essential cookies used)
  - **About Us**: About PaperBoxd dialog with mission and features

**Privacy Features**:
- Server-side tracking (no third-party analytics cookies)
- Local storage for preferences (theme, cookie settings)
- Essential cookies only (NextAuth session cookies)
- GDPR-ready architecture

### Rich Text Editor (Tiptap)

**Full-Featured Text Editor**:
- Comprehensive rich text editing powered by Tiptap
- **Toolbar Features**:
  - Text formatting: Bold, Italic, Underline, Strikethrough
  - Headings: H1, H2, H3
  - Lists: Bulleted and numbered lists
  - Text alignment: Left, Center, Right
  - Code blocks and inline code
  - Blockquotes
  - Text highlighting (multicolor)
  - Subscript and superscript
  - Undo/Redo functionality
  - Custom link dialog (replaces browser prompt) - accepts any URL, auto-prepends `https://` if needed
- **Usage**:
  - **General Diary Entries**: "Write" button in header opens full-featured editor
  - **Book-Specific Entries**: "Write about it" button on book detail pages opens editor with book context
- **Accessibility**: Proper ARIA labels, keyboard navigation, and screen reader support
- **Responsive**: Dropdown menus escape container boundaries for better UX

### Book Sharing

**Share Books with Followers**:
- Share button on book detail pages opens share modal
- Search and select followers to share with
- Shared books appear as notifications in recipient's "Updates" section
- Clickable notifications navigate to the shared book page
- Activity format: `[username] shared [bookname]`

### Authentication Flow

**Registration**:
- Email/password with validation (Zod schemas)
- Username uniqueness check (database validation)
- Automatic sign-in after registration
- Redirect to username selection page

**Onboarding**:
- **Username Selection**: Required step after registration
- **Questionnaire**: Multi-step onboarding to understand user preferences
  - Genre selection (multiple genres)
  - Reading habits and preferences
  - Used to personalize recommendations
- Smooth redirect flow: Registration → Username → Onboarding → Profile

**Sign-In**:
- Email/password with error handling (toast notifications)
- Google OAuth option (optional)
- Session persistence via NextAuth
- Redirect to intended page or profile

**Session Management**:
- JWT tokens in HTTP-only cookies
- Theme preferences in localStorage (client-side)
- Avatar images excluded from JWT to prevent cookie size issues
- Automatic session refresh

---

## Project Structure

```
paperboxd/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (Server-side)
│   │   ├── auth/                 # NextAuth routes
│   │   ├── users/                # User CRUD & social features
│   │   │   ├── [username]/lists/ # List CRUD, sharing, saving
│   │   │   ├── [username]/activities/ # Activity feed & following activities
│   │   │   └── [username]/following # Following list management
│   │   ├── books/                # Book search, details, carousels
│   │   ├── authors/              # Author search
│   │   ├── onboarding/           # Onboarding questionnaire
│   │   ├── recommendations/      # Recommendation engine
│   │   ├── events/               # Event tracking
│   │   ├── newsletter/           # Newsletter subscription
│   │   └── cleanup/              # Data cleanup endpoints
│   ├── u/[username]/             # Dynamic user profile pages
│   │   └── lists/[listId]/       # List detail pages
│   ├── b/[slug]/                 # Book detail pages with carousels
│   ├── profile/                  # Profile redirect (auth check)
│   ├── choose-username/          # Username selection page
│   ├── onboarding/               # Onboarding questionnaire page
│   ├── activity/                 # User activity feed
│   ├── feed/                     # Main book feed page (renamed from /books)
│   ├── auth/                     # Authentication pages
│   ├── layout.tsx                # Root layout (theme script, providers)
│   ├── page.tsx                  # Homepage (public/authenticated)
│   ├── not-found.tsx             # 404 page
│   └── globals.css               # Global styles
│
├── components/                   # React Components
│   └── ui/                       # UI Component Library
│       ├── buttons/              # Button variants
│       ├── dock/                 # Tab navigation components
│       ├── forms/                # Form components
│       ├── layout/               # Layout components (Header - fixed positioning)
│       ├── home/                 # Homepage components (PublicHome, AuthenticatedHome, BookCarousel, Hero)
│       ├── shared/               # Shared utilities (animations)
│       ├── demos/                # Component demos
│       ├── onboarding-questionnaire.tsx  # Onboarding questionnaire component
│       ├── username-selection.tsx        # Username selection component
│       ├── footer-section.tsx            # Footer with newsletter and legal dialogs
│       ├── privacy-policy-dialog.tsx     # Privacy policy dialog
│       ├── terms-of-service-dialog.tsx   # Terms of service dialog
│       ├── cookie-settings-dialog.tsx    # Cookie settings dialog
│       ├── about-us-dialog.tsx           # About us dialog
│       ├── signup-prompt-dialog.tsx      # Sign-up prompt for non-authenticated users
│       ├── tetris-loader.tsx             # Tetris loading animation
│       ├── tiptap-editor.tsx             # Rich text editor component
│       ├── diary-editor-dialog.tsx       # Book-specific diary entry editor
│       ├── general-diary-editor-dialog.tsx # General diary entry editor
│       └── [primitives]/         # Base UI components
│
├── lib/                          # Utilities & Configurations
│   ├── db/                       # Database
│   │   ├── mongodb.ts            # Connection management
│   │   └── models/               # Mongoose schemas
│   │       ├── User.ts           # User model
│   │       ├── Book.ts           # Book model
│   │       ├── Newsletter.ts     # Newsletter subscription model
│   │       ├── UserPreference.ts # User preference model (for recommendations)
│   │       ├── Event.ts          # Event tracking model
│   │       ├── RecommendationCache.ts    # Recommendation cache model
│   │       ├── RecommendationLog.ts      # Recommendation performance tracking
│   │       └── AccountDeletion.ts        # Account deletion requests
│   ├── services/                 # Business logic services
│   │   ├── UserProfileBuilder.ts # Builds user preference profiles
│   │   ├── EventTracker.ts       # Tracks user interactions
│   │   ├── RecommendationService.ts      # Core recommendation engine
│   │   └── FriendRecommendations.ts      # Friend-based recommendations
│   ├── config/                   # Configuration files
│   │   └── recommendation.config.ts      # Recommendation algorithm config
│   ├── auth.ts                   # NextAuth configuration
│   ├── auth-client.ts            # Client-side auth helpers
│   └── utils.ts                  # Utility functions (cn, etc.)
│
├── hooks/                        # Custom React Hooks
│   └── use-media-query.tsx       # Responsive breakpoint hooks
│
└── public/                       # Static assets
```

---

## Design Decisions & Rationale

### Why Next.js App Router?

- **Server Components**: Reduce client bundle size by rendering on server
- **File-based Routing**: Intuitive, convention-based routing
- **API Routes**: Integrated backend eliminates need for separate server
- **Streaming SSR**: Progressive page loading for better perceived performance
- **Built-in Optimizations**: Image optimization, font optimization, code splitting

### Why MongoDB?

- **Flexible Schema**: Easy to evolve data models as features grow
- **Rich Document Structure**: Nested data (e.g., `bookshelf` array in User) reduces joins
- **Atlas Free Tier**: Sufficient for MVP and early growth (512MB)
- **Mongoose ODM**: TypeScript support, validation, middleware hooks
- **Horizontal Scalability**: Easy to shard when needed

### Why Tailwind CSS?

- **Utility-First**: Rapid UI development without context switching
- **Design System**: Consistent spacing, colors, typography
- **Performance**: Purged CSS ensures minimal bundle size
- **Responsive**: Built-in breakpoint system
- **Dark Mode**: Native support via `dark:` variant

### Why Radix UI + Custom Components?

- **Accessibility**: Radix handles ARIA, keyboard navigation, focus management
- **Unstyled Primitives**: Full control over design while maintaining accessibility
- **Shadcn Pattern**: Proven component architecture used by thousands of projects
- **Composability**: Mix Radix primitives with custom logic seamlessly

### Why NextAuth.js v5?

- **Integrated Solution**: No need for separate auth service
- **Multiple Providers**: Credentials + OAuth in one package
- **Session Management**: Built-in JWT and database session strategies
- **TypeScript Support**: Excellent type safety
- **Middleware**: Route protection with minimal code

### Why Hybrid Search (DB + Google Books)?

- **Performance**: Database queries are 10-50x faster than API calls
- **Cost Efficiency**: Reduced Google Books API usage saves quota
- **Reliability**: Not dependent on external API for cached books
- **User Experience**: Instant results for previously searched books
- **Storage Management**: Automatic cleanup prevents unbounded growth

---

## Future Considerations

### Scalability Roadmap

1. **Database Sharding**: Partition users by region or shard key
2. **CDN for Static Assets**: Cloudflare or Vercel Edge Network
3. **Redis Caching**: Cache frequently accessed data (user profiles, book details)
4. **GraphQL API**: Consider GraphQL if API complexity grows
5. **Microservices**: Split API routes into separate services if needed

### Feature Expansion

- **Book Reviews**: Full review system with ratings (infrastructure in place)
- **Recommendations**: ✅ Implemented - Sophisticated rule-based recommendation system with multi-signal learning
- **Rich Text Editor**: ✅ Implemented - Full-featured Tiptap editor for diary entries
- **Book Sharing**: ✅ Implemented - Share books with followers via activity feed
- **Private Lists**: ✅ Implemented - Private lists with username-based access management
- **Profile Link Sharing**: ✅ Implemented - Copy profile link to clipboard from header dropdown
- **Social Groups**: Book clubs and reading groups
- **Reading Challenges**: Annual/yearly reading goals
- **Export Data**: Export reading history (CSV, JSON)
- **Newsletter**: ✅ Implemented - Email subscription system
- **Onboarding**: ✅ Implemented - User preference questionnaire

### Technical Debt

- **Image Upload**: Currently disabled (base64 in MongoDB caused cookie size issues). Future: Cloudinary or S3 integration
- **Rate Limiting**: Implement API rate limiting middleware
- **Analytics**: Server-side tracking implemented via EventTracker. Future: Optional privacy-respecting analytics (Plausible, PostHog) with user consent
- **Testing**: Add unit tests (Vitest) and E2E tests (Playwright)
- **Newsletter Email Service**: Currently stores emails in database. Future: Integrate with email service provider (SendGrid, Mailchimp, etc.)

---

## Contributing

PaperBoxd is open source, but contributions are managed through our internal development process.
