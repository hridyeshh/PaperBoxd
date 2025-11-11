# AI Change Log

## 2025-11-11

- **Change**: Expanded the home page to render `AnimatedGridPattern` directly across the full viewport and removed the demo heading.
- **Why Needed**: The previous demo wrapper limited the grid to a 500px block and surfaced placeholder text the user no longer wanted.
- **Performance Impact**: Simplifying the DOM structure reduces unnecessary layout work and lets the animation run without clipping, improving visual responsiveness.

- **Change**: Integrated the `Hero` marketing section and demo, layering it above the animated grid background.
- **Why Needed**: The page required real content over the animation plus reusable exports for future sections.
- **Performance Impact**: Reuses existing button variants and animations, avoiding additional bundles while keeping renders minimal.

- **Change**: Removed duplicated `Hero` component definition that caused a `motion` identifier collision.
- **Why Needed**: Duplicate imports triggered a TypeScript compile error, blocking builds.
- **Performance Impact**: Keeps the bundle lean by exporting a single component instance without redundant declarations.

- **Change**: Added `InteractiveHoverButton` and replaced hero CTAs with the interactive design.
- **Why Needed**: Aligns the hero call-to-action styling with the requested hover animation and button behavior.
- **Performance Impact**: Reuses shared utility classes; no new runtime cost beyond a small component addition.

- **Change**: Reorganized UI components into domain folders (`home`, `shared`) and added re-export shims.
- **Why Needed**: Supports future feature grouping (books, authors, etc.) while keeping shared primitives in a single place.
- **Performance Impact**: Purely structural refactor that preserves import paths and keeps module resolution fast.

- **Change**: Updated the interactive hover button to hide the resting state accent dot.
- **Why Needed**: The visible dot on the launch article button conflicted with the desired clean default appearance.
- **Performance Impact**: CSS-only adjustment; no measurable runtime cost.

- **Change**: Added a `showIdleAccent` option so only selected buttons hide the resting dot.
- **Why Needed**: The primary hero CTA needed a clean idle state while secondary actions kept the animated accent.
- **Performance Impact**: Conditional class merge only; negligible runtime impact.

- **Change**: Reduced the animated hero rotating subtitle size for better balance.
- **Why Needed**: The longer phrases for PaperBoxd overflowed at larger sizes on smaller breakpoints.
- **Performance Impact**: Styling tweak only; no runtime cost.

- **Change**: Nudged the rotating subtitle text lower within the hero stack.
- **Why Needed**: Adjusted vertical alignment after enlarging the main “PaperBoxd” heading.
- **Performance Impact**: CSS positioning only; zero runtime impact.

- **Change**: Added a sticky PaperBoxd header with search and mobile navigation, organizing it under `components/ui/layout`.
- **Why Needed**: Provides a consistent top bar aligned with the new layout structure while keeping shared primitives reusable.
- **Performance Impact**: Lightweight UI addition; leverages existing modal/sheet primitives for minimal overhead.

- **Change**: Updated the home page layout to include the new header and refreshed search suggestions with reading-focused copy.
- **Why Needed**: Ensures the hero content sits below the navigation while reinforcing the app’s book-tracking messaging.
- **Performance Impact**: Layout-only adjustment; no measurable runtime impact.

- **Change**: Enlarged the header height and widened its container for better balance with the hero content.
- **Why Needed**: The Books/Authors navigation needed more breathing room to match the rest of the layout.
- **Performance Impact**: Styling-only tweak with no measurable runtime impact.

