# Changelog

## 2025-11-11

- **What**: Updated the home page to render the animated grid pattern full-screen and removed the demo heading text.
- **Why**: The grid previously appeared in a constrained demo block and displayed placeholder text that the user requested to remove.
- **How**: Replaced the demo component usage in `app/page.tsx` with a direct `AnimatedGridPattern` instance and simplified the demo component to drop the heading.

- **What**: Added the animated hero marketing section and overlaid it atop the animated background.
- **Why**: The homepage needed real promotional content and a reusable demo showcasing the hero copy/CTA.
- **How**: Created `components/ui/home/hero.tsx`, exposed `HeroDemo`, and rendered `Hero` within `app/page.tsx` above the grid.

- **What**: Fixed duplicate `Hero` component/export that re-imported `motion` and threw a compile error.
- **Why**: TypeScript reported “Duplicate identifier 'motion'” due to a copy-pasted block appended to the file.
- **How**: Removed the redundant imports and component definition so only the intended `Hero` export remains.

- **What**: Introduced `InteractiveHoverButton` and swapped the hero CTAs to use the new animated style.
- **Why**: Requested hover-driven button animation for promotional and authentication calls to action.
- **How**: Added `components/ui/shared/interactive-hover-button.tsx`, a demo wrapper, and replaced `Button` usage inside `Hero` with the new component.

- **What**: Reorganized UI primitives and page components into `components/ui/shared` and `components/ui/home`.
- **Why**: Establishes a scalable structure for future domains (books, authors, etc.) while keeping shared building blocks centralized.
- **How**: Moved background, button, and hero modules into the new folders and left re-export shims (`components/ui/button.tsx`, etc.) to preserve imports.

- **What**: Removed the default-state accent dot from the interactive hover buttons.
- **Why**: The resting black dot on “Read our launch article” didn't align with the requested clean appearance.
- **How**: Tweaked the button's background animation div to start transparent and hidden until hover.

- **What**: Introduced a `showIdleAccent` prop to control the hover accent dot per button.
- **Why**: Only the launch article CTA needed the dot hidden; login/sign-up buttons continue using the accent.
- **How**: Added the prop to `InteractiveHoverButton` and disabled it for the hero's primary button.

- **What**: Tightened the font size of the rotating hero subtitle phrases.
- **Why**: Longer PaperBoxd phrases overwhelmed the layout at the previous typography scale.
- **How**: Applied responsive `text-3xl md:text-5xl` classes to the animated `<motion.span>` elements.

- **What**: Lowered the animated subtitle’s vertical position.
- **Why**: Keeping the copy visually centered once the main heading grew to `text-9xl`.
- **How**: Added `top-3 md:top-6` offsets to the rotating `<motion.span>` instances.

- **What**: Implemented a sticky PaperBoxd header with search and mobile navigation.
- **Why**: The homepage needed a consistent top bar that matches the refreshed design language and supports mobile navigation.
- **How**: Added `components/ui/layout/header-with-search.tsx`, exposed it via `components/ui/header-with-search.tsx`, and reused existing sheet/modal primitives.

- **What**: Updated the home layout to include the header and refreshed search suggestions to focus on reading workflows.
- **Why**: Aligns the hero presentation with the new navigation while surfacing relevant shortcuts in the command palette.
- **How**: Wrapped the hero in a flex column layout inside `app/page.tsx` and replaced the search dataset with PaperBoxd-centric copy.

- **What**: Increased the header height and container width to better match the hero scale.
- **Why**: The Books/Authors navigation needed additional breathing room to feel proportionate with the enlarged hero heading.
- **How**: Adjusted the header nav to `h-20` with an expanded `max-w-6xl` container and updated padding.

