"use client";

// Shared content + sections used by BOTH the landing page and the dedicated
// /case-studies and /faq routes. Single source of truth.
// Port of the design prototype's web/sections.jsx.

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useBooks, coverBg, type LandingBook } from "@/components/ui/landing/books";

// ── Case studies ──────────────────────────────────────────────────────────────

export type CaseLink = { label: string; href: string };

export type CaseStudy = {
  slug: string;
  wide?: boolean;
  tag: string;
  ttl: string;
  p: string;
  lift: string;
  liftL: string;
  covers: number[];
  /** true → not built yet. Renders as "What PaperBoxd will do" and the tag says Planned. */
  planned?: boolean;
  challenge: string;
  /** What PaperBoxd does about it today, or will do where `planned`. Never a measured result. */
  approach: string;
  /** Published third-party reporting. Every number on this page comes from here. */
  precedent: string;
  /** Sourced figures only — nothing self-reported. */
  metrics: { n: string; l: string }[];
  links: CaseLink[];
};

export const PBW_CASES: CaseStudy[] = [
  {
    slug: "arc",
    wide: true,
    tag: "Publishing · Planned",
    ttl: "Revamping the ARC, without printing a single one",
    planned: true,
    p: "Not built yet. The plan: pre-release shelves instead of print mailings, where readers log reactions and dog-eared quotes as they go — so the conversation runs the length of the book rather than arriving as one post at the end.",
    lift: "Digital-first",
    liftL: "the model NetGalley made standard",
    covers: [3, 5, 9, 14],
    challenge:
      "Print ARC distribution is expensive, review rates are low, and the buzz it does create is scattered across platforms that never convert into pre-orders.",
    approach:
      "Planned, not shipped: pre-release shelves gated to early readers, with reactions posted during the read rather than after finishing. There is no publisher-facing product today.",
    precedent:
      "This digital-first, social-proof approach is the model NetGalley has made the industry standard for getting secure digital review copies to reviewers, influencers and librarians ahead of publication. NetGalley has since extended it toward consumers with Booktrovert, letting publishers run direct-to-reader giveaways and discovery campaigns.",
    metrics: [
      { n: "Booktrovert", l: "NetGalley's direct-to-reader extension of the same model" },
    ],
    links: [{ label: "How NetGalley works", href: "https://www.netgalley.com/tour" }],
  },
  {
    slug: "creators",
    tag: "Creators · Escaping the algorithm",
    ttl: "A shelf that outlives the video",
    p: "Monthly wrap-ups and favourites as native lists rather than a video that scrolls away, with the profile as the link-in-bio destination.",
    lift: "38%",
    liftL: "young readers trust BookTok over friends",
    covers: [1, 6, 11],
    challenge:
      "Video algorithms reward trending audio and fast cuts, which quietly suppresses the deep-dive recommendation content book creators are actually good at.",
    approach:
      "Keep the videos, move the canonical list to PaperBoxd — named by hyper-specific mood rather than genre, since a list here is just a shelf with a point of view.",
    precedent:
      "Niche, identity-driven creator recommendation is measurably powerful: a UK study reported by State of Digital Publishing found 38% of young people rely on BookTok for recommendations over family and friends, and 68% said it made them read a book they would not otherwise have considered. The same dynamic pushed Colleen Hoover past 20 million copies sold globally, and Penguin Random House's creator campaign for Last Night at the Telegraph Club produced a sevenfold sales increase.",
    metrics: [
      { n: "38%", l: "Of young readers who trust BookTok over friends and family" },
      { n: "68%", l: "Who read a book they would not otherwise have considered" },
    ],
    links: [
      { label: "BookTok's impact on book sales — State of Digital Publishing", href: "https://www.stateofdigitalpublishing.com/audience-development/booktok-bolsters-book-reading/" },
      { label: "Social media and publishing: the Colleen Hoover case study — ETSU", href: "https://dc.etsu.edu/honors/771/" },
    ],
  },
  {
    slug: "libraries",
    tag: "Libraries · Planned",
    ttl: "Local availability, attached to the moment of discovery",
    planned: true,
    p: "Not built yet. The plan: add a book to a shelf and a quiet local-availability tag appears — wait time, or an instant digital loan from the branch you already belong to.",
    lift: "820M",
    liftL: "digital library checkouts, 2025",
    covers: [4, 8, 12],
    challenge:
      "Readers discover books socially, then hit friction working out whether their local library has a copy. The intention dies somewhere between the recommendation and the catalogue search.",
    approach:
      "Planned, not shipped: surface holds and instant digital lending inline on the shelf, so borrowing is a tap rather than a separate errand. No library catalogue is integrated today.",
    precedent:
      "Demand for frictionless digital lending is enormous and still climbing. OverDrive, which builds Libby, reported 820 million digital library checkouts in 2025 — up nearly 11% on 2024 — with 9.8 million new Libby installs in that year alone.",
    metrics: [
      { n: "820M", l: "Digital library checkouts industry-wide, 2025 (+11% YoY)" },
      { n: "9.8M", l: "New Libby installs in 2025 alone" },
    ],
    links: [{ label: "OverDrive: 820 million digital checkouts in 2025", href: "https://www.wordsandmoney.com/overdrive-says-digital-checkouts-topped-820-million-in-2025/" }],
  },
  {
    slug: "dnf",
    wide: true,
    tag: "Product · Planned",
    ttl: "Abandoning a book became a valid reading decision",
    planned: true,
    p: "Not built yet. The plan: a DNF status that takes the one line of why — no broken streak, no guilt, no pretending you finished it.",
    lift: "Mood-first",
    liftL: "how StoryGraph grew against Goodreads",
    covers: [2, 10, 13, 21],
    challenge:
      "The sharpest drop-off in reading apps happens during a slump. Readers who can't finish a book stop logging entirely rather than admit the streak is broken, and the app loses them along with the honest data.",
    approach:
      "Planned, not shipped: a DNF status beside Reading and Finished, taking one line of reason and staying off your books-read count. There is a DNF tab on the profile today, but it lists everything you have started or queued and not finished — the same books as the procrastination wall — rather than the ones you decided to put down. Nothing marks a book abandoned yet, and there is no reason field.",
    precedent:
      "This mirrors how The StoryGraph grew against Goodreads — mood-based stats and non-judgemental tracking, including importing Goodreads did-not-finish shelves wholesale, with machine-learning recommendations weighted on mood rather than star ratings. Its own public roadmap carries community requests for granular DNF metrics so readers can see abandonment rates before committing.",
    metrics: [
      { n: "Wholesale", l: "StoryGraph imports Goodreads did-not-finish shelves outright" },
      { n: "Open request", l: "Granular DNF rates sit on StoryGraph's public roadmap" },
    ],
    links: [
      { label: "StoryGraph on the App Store", href: "https://apps.apple.com/us/app/storygraph-reading-tracker/id1570489264" },
      { label: "DNF stats — The StoryGraph roadmap", href: "https://roadmap.thestorygraph.com/requests-ideas/posts/dnf-stats-on-books" },
    ],
  },
  {
    slug: "bookshops",
    tag: "Bookshops · Planned",
    ttl: "A front-of-shop table the neighbourhood picked",
    planned: true,
    p: "Not built yet. The plan: a shop-scoped view of what readers nearby are shelving and finishing, refreshed weekly — sitting alongside the staff picks rather than replacing them.",
    lift: "50M+",
    liftL: "BookTok books sold in Europe, 2025",
    covers: [17, 2, 19],
    challenge:
      "Independent bookshops compete with a recommendation engine that runs 24 hours a day on somebody else's platform, and they see none of the signal it generates about their own neighbourhood.",
    approach:
      "Planned, not shipped: give the shop the local signal — what readers within a few miles are shelving and finishing, refreshed weekly. There is no shop-facing product or location data today.",
    precedent:
      "Community-driven recommendation converts at retail scale: TikTok reported that more than 50 million #BookTok-recommended books were sold across Europe in 2025, worth roughly €800 million in its key book markets — demand that arrives in shops already primed rather than needing to be sold from cold.",
    metrics: [
      { n: "50M+", l: "BookTok-driven book sales across Europe, 2025" },
      { n: "€800M", l: "Value in TikTok's key European book markets" },
    ],
    links: [{ label: "#BookTok helps sell 50 million books across Europe — TikTok Newsroom", href: "https://newsroom.tiktok.com/booktok-community-50-million-books?lang=en-150" }],
  },
  {
    slug: "education",
    tag: "Education · Reading without a reading log",
    ttl: "Self-selection beats the compliance worksheet",
    p: "No worksheets, no comprehension quizzes. Self-selected books, a private list the class shares, a leaderboard ranked on consistency, and abandoning a book counted as a real choice.",
    lift: "164k",
    liftL: "students in the PISA reading analysis",
    covers: [6, 14, 1],
    challenge:
      "Compulsory reading logs measure compliance, not reading. Students learn to report what the log rewards, and teachers lose sight of what anyone is actually reading.",
    approach:
      "Self-selected books, a private list shared with the class, and a leaderboard that ranks on streak or diary entries instead of pages — so a poetry reader isn't losing to someone speed-running airport thrillers. A Friends tab narrows the board to people you follow, though scope and metric can't yet be combined. These are the existing lists and leaderboard used deliberately; there is no separate classroom product.",
    precedent:
      "The research consistently favours self-selection: independent, self-chosen reading is associated with higher engagement, better literacy outcomes and stronger retention, and large-scale PISA analysis across 164,233 secondary students in 24 countries found reading self-perception and metacognitive knowledge robustly correlated with digital reading performance.",
    metrics: [
      { n: "164k", l: "Students in the PISA reading-engagement analysis" },
      { n: "24", l: "Countries covered by that analysis" },
    ],
    links: [
      { label: "Independent reading research overview — EBSCO", href: "https://www.ebsco.com/research-starters/education/independent-reading" },
      { label: "Reading engagement and digital reading performance — ScienceDirect", href: "https://www.sciencedirect.com/science/article/abs/pii/S0959475225000817" },
    ],
  },
  {
    slug: "audio",
    tag: "Audio · Planned",
    ttl: "Making listening count like pages read",
    planned: true,
    p: "Progress already reads as a percentage rather than a page count. Next: a format you can actually set, and minutes logged like pages converting to that same percentage, so the ebook, the audiobook and the paperback of one title stay comparable on the same shelf.",
    lift: "$2.43B",
    liftL: "US audiobook sales, 2025",
    covers: [13, 20, 5],
    challenge:
      "Most trackers treat an audiobook as a second-class edition or refuse to count it, which quietly tells a third of readers that their reading doesn't count.",
    approach:
      "Page progress reads as a percentage today, so editions of one title stay comparable. The rest is planned, not shipped: a Print/Digital/Audio format exists in the data model but there is no way to set it on the web yet, and logging minutes like pages is still to come.",
    precedent:
      "Audio is no longer a niche format. The Audio Publishers Association put US audiobook sales at $2.43 billion in 2025, up 9% year on year, with 58% of American adults — an estimated 157 million people — having listened to an audiobook and publishers reporting over 750,000 active titles, a 43% jump on 2024.",
    metrics: [
      { n: "$2.43B", l: "US audiobook sales, 2025 (+9% YoY)" },
      { n: "157M", l: "Americans who have listened to an audiobook" },
    ],
    links: [{ label: "US audiobook sales grew 9% in 2025 — Publishers Weekly", href: "https://www.publishersweekly.com/pw/by-topic/industry-news/audio-books/article/100588-u-s-audiobook-sales-up-9-in-2025-reaches-2-43-billion.html" }],
  },
  {
    slug: "migration",
    tag: "Migration · Bringing a decade with you",
    ttl: "Ten years of Goodreads, imported free",
    p: "Export the CSV, drop it in during onboarding. Matching runs ISBN first, then title and author, and anything it can't find is skipped and counted for you afterwards.",
    lift: "Free",
    liftL: "what importing costs here, on every account",
    covers: [11, 4, 8],
    challenge:
      "A decade of ratings, dates and review text is the single biggest reason people stay on a tracker they've stopped enjoying. Switching means either abandoning that history or trusting an importer to carry it across intact.",
    approach:
      "A free importer on every account: shelves and star ratings, matched on ISBN first and title + author as a fallback, with unmatched rows skipped and reported back as a count plus a sample. Dates read, review text and a review step for uncertain matches are all still to come.",
    precedent:
      "Goodreads' CSV export is the de facto migration path off the platform, and the ecosystem has grown around it — The StoryGraph's importer is the best-known destination. Keeping migration free on every account, with no tier attached to it, is the design decision here.",
    metrics: [
      { n: "CSV", l: "The de facto way to move a decade of reading history" },
      { n: "Free", l: "What importing costs on PaperBoxd, on every account" },
    ],
    links: [{ label: "How to import a Goodreads library to StoryGraph", href: "https://bookwiseapp.com/blog/how-to-import-your-goodreads-library-to-storygraph-step-by-step" }],
  },
  {
    slug: "vibe-search",
    tag: "Product · Vibe search",
    ttl: "Asking for a feeling, not a genre",
    p: "One open field instead of a genre dropdown. Describe the mood you want to be in and the search answers in books.",
    lift: "Mood + pace",
    liftL: "the axis competitors converged on",
    covers: [0, 7, 15],
    challenge:
      "The genre dropdown is a filing system, not a way anyone describes what they want to read next.",
    approach:
      "One open field instead of the dropdown, answered with books rather than a filtered category list.",
    precedent:
      "Mood-first discovery is the axis competitors are converging on — The StoryGraph's whole recommendation pitch is mood and pace over genre and star rating — and it maps onto how social discovery already works, where readers describe a feeling and the community answers with titles.",
    metrics: [
      { n: "Mood + pace", l: "StoryGraph's core differentiator over genre and stars" },
    ],
    links: [{ label: "StoryGraph on the App Store", href: "https://apps.apple.com/us/app/storygraph-reading-tracker/id1570489264" }],
  },
  {
    slug: "taste-graph",
    tag: "Data · Planned",
    ttl: "Readers don't have genres, they have weather",
    planned: true,
    p: "Planned: model the free-text reason alongside the star, and cluster on how a book felt rather than which shelf it files under.",
    lift: "50M+",
    liftL: "books sold by feeling, not category",
    covers: [9, 15, 0],
    challenge:
      "Star ratings compress everything interesting out of a reading experience. Two five-star books can have nothing in common and one-star reviews are frequently the most useful signal in the dataset.",
    approach:
      "Planned for the embeddings-based recommendation work, not shipped: model the free-text reason alongside the rating, cluster on mood and pace rather than category, and let abandonment be a signal rather than missing data.",
    precedent:
      "The industry is moving the same way: mood- and pace-based tagging is StoryGraph's core differentiator, and the scale of social recommendation — 50 million BookTok-driven sales across Europe in 2025 alone — shows readers already navigate by feeling when a platform lets them.",
    metrics: [
      { n: "50M", l: "BookTok-driven sales across Europe, 2025" },
      { n: "Mood + pace", l: "StoryGraph's clustering axes, ahead of genre" },
    ],
    links: [{ label: "#BookTok helps sell 50 million books across Europe — TikTok Newsroom", href: "https://newsroom.tiktok.com/booktok-community-50-million-books?lang=en-150" }],
  },
];

// Every figure here is third-party and sourced in PBW_CASES links. Nothing on
// this site self-reports PaperBoxd's own usage.
export const PBW_METRICS = [
  { n: "820M", l: "Digital library checkouts, 2025" },
  { n: "50M+", l: "BookTok books sold in Europe, 2025" },
  { n: "$2.43B", l: "US audiobook sales, 2025" },
  { n: "38%", l: "Young readers who trust BookTok most" },
];

// ── FAQ ───────────────────────────────────────────────────────────────────────

// cover: index into the shared book set — each spine wears a real jacket.
export const PBW_CATS = [
  { k: "start", l: "Getting started", cover: 7 },
  { k: "track", l: "Tracking books", cover: 4 },
  { k: "social", l: "Friends & lists", cover: 5 },
  { k: "acct", l: "Account & data", cover: 14 },
];

// top: true → also shown in the landing page's five-question digest.
export const PBW_QS = [
  { c: "start", top: true, q: "What actually is PaperBoxd?", a: "A reading diary that behaves like a social network. You log what you read, rate it, write as much or as little as you like, and follow the people whose taste you trust. Think of it as a shelf that remembers <em>why</em> you loved something — not just that you finished it." },
  { c: "start", top: true, q: "Is it free?", a: "Yes. Everything that exists today is free — diary, shelves, lists, friends, search, vibe search and the Goodreads import — with no ads and no billing of any kind wired up. If that ever changes for some future extra, it'll be said here first, and the reading tracker itself stays free." },
  { c: "start", top: true, q: "Can I bring my Goodreads library over?", a: "Yes, free, on every account. Export the CSV from Goodreads and drop it in during onboarding. Matching runs ISBN first, then falls back to title + author. Your shelves and star ratings come across — <em>dates read and review text don't yet</em> — and any book that can't be matched is skipped rather than guessed at, with a count and a sample of the titles shown when the import finishes." },
  { c: "start", q: "Is there an app, or is this web only?", a: "Web only for now, and everything described on this site works there. iOS and Android are in build, and they're where <strong>Scan &amp; Know</strong> will land — point your camera at a spine or barcode and the book is on your shelf in under a second. Neither the apps nor the scanner are out yet." },
  { c: "track", q: "What are the shelves?", a: "<strong>Procrastination wall</strong> (bought it, haven't opened it), <strong>Reading</strong> — anything on the wall you've logged a page against — <strong>Finished</strong>, and <strong>Liked</strong>. There's a <strong>DNF</strong> tab on your profile too, but read it for what it is today: everything you started or queued and haven't finished, not the books you decided to put down. A real DNF status, with the one line of why, is the next thing being built — giving up on a book is a reading decision and deserves a shelf of its own." },
  { c: "track", q: "How does page progress work?", a: "Tap the progress ring and type a page number, or hold to slide. We convert to a percentage so editions of the same title stay comparable. Audiobooks aren't their own thing yet — there's no format switch on the web, and logging minutes instead of pages is on the list, not built." },
  { c: "track", q: "How do streaks work?", a: "A streak day counts when you log at least one page of any book, on any calendar day (UTC). Miss a whole day and the streak resets to zero — there are no grace days or freezes yet, so a holiday <em>will</em> end a run. If that's the wrong call, tell me; it's the change I get asked about most." },
  { c: "track", q: "Can I keep some entries private?", a: "Any diary entry or whole list can be set to private with one tap. Private entries still count toward your stats and streaks — they just never appear in a friend's feed. Ratings don't have their own private switch yet; they follow the book they're attached to." },
  { c: "social", q: "What shows up in my friends' feed?", a: "Finished books, ratings, public diary entries, books you start, lists you create or share, and books you share or like. Not: your page-by-page progress, and not anything you marked private." },
  { c: "social", q: "How do lists work?", a: "A list is a shelf with a point of view. Give it a name (\"quietly devastating\", \"read on trains\"), add books, and it becomes shareable and saveable. Lists can be collaborative — invite other readers and they can add to the same shelf." },
  { c: "social", q: "Is the leaderboard going to make reading competitive?", a: "Only if you want it to be. The board can be ranked on books finished, pages, diary entries, streak or XP — rank on streak instead of pages and a poetry reader isn't losing to someone speed-running airport thrillers. A separate Friends tab narrows it to people you follow, though it ranks on XP; choosing a metric <em>and</em> a friends-only scope at once isn't possible yet." },
  { c: "acct", top: true, q: "Can I get my data out?", a: "Yes, and there are no dark patterns in the way — but there's no self-serve export button yet. Email <a href=\"mailto:hridyesh@paperboxd.in\">hridyesh@paperboxd.in</a> from your account address and I'll send you your books, ratings, dates and diary entries. A one-click export is on the list." },
  { c: "acct", q: "Is my reading data used to train AI models?", a: "No. Your diary text is not used to train any model, and your reading data is not sold. Vibe search sends your query to the server, and when you're signed in it uses your library to personalise what comes back — for that search, in that moment, nothing more. The full detail lives in the <a href=\"/privacy\">privacy policy</a> — if anything there is unclear, email me and I'll fix the wording." },
  { c: "acct", q: "How do I delete my account?", a: "Ask and it's done — deletion removes your account and signs you out everywhere. You'll be asked why first, which is genuinely just so I know what to fix. Exact retention timings are in the <a href=\"/privacy\">privacy policy</a>." },
  { c: "acct", q: "Who can see my profile?", a: "Public by default — your shelves and finished books are visible to anyone who finds you. Switch the account to private and that flips: your name, avatar and follower counts stay visible so people know who they're asking, but your shelves, diary, lists and stats are hidden until you approve them as a follower. Requests wait in a list on your profile. Going public again lets everyone who was waiting straight in." },
];

export const PBW_ARROW = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
);

// ── Pointer-driven 3D tilt ────────────────────────────────────────────────────

type TiltOpts = { ampX?: number; ampY?: number; baseX?: number; baseY?: number; global?: boolean };

export function useTilt({ ampX = 8, ampY = 18, baseX = 6, baseY = 0, global = false }: TiltOpts = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState({ x: baseX, y: baseY });
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const target: Window | HTMLDivElement | null = global ? window : ref.current;
    if (!target) return;
    const on = (e: Event) => {
      const pe = e as PointerEvent;
      const box = global
        ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
        : ref.current?.getBoundingClientRect();
      if (!box) return;
      const nx = ((pe.clientX - box.left) / box.width - 0.5) * 2;
      const ny = ((pe.clientY - box.top) / box.height - 0.5) * 2;
      setV({ x: baseX - ny * ampX, y: baseY + nx * ampY });
    };
    const off = () => setV({ x: baseX, y: baseY });
    target.addEventListener("pointermove", on, { passive: true });
    if (!global) target.addEventListener("pointerleave", off);
    return () => {
      target.removeEventListener("pointermove", on);
      if (!global) target.removeEventListener("pointerleave", off);
    };
  }, [ampX, ampY, baseX, baseY, global]);
  const vars = { "--rx": v.x.toFixed(2) + "deg", "--ry": v.y.toFixed(2) + "deg" } as React.CSSProperties;
  return [ref, vars] as const;
}

// ── Metrics band ──────────────────────────────────────────────────────────────

export function MetricsBand() {
  return (
    <div className="pbw-metrics">
      {PBW_METRICS.map((m, i) => (
        <div className="pbw-metric pbw-in" key={m.l} style={{ animationDelay: 0.1 + i * 0.09 + "s" }}>
          <div className="pbw-metric__n">{m.n}</div>
          <div className="pbw-metric__l">{m.l}</div>
        </div>
      ))}
    </div>
  );
}

// ── One case-study card (3D cover stack fans out on hover) ────────────────────

function CaseCard({ c, i = 0, href }: { c: CaseStudy; i?: number; href: string }) {
  const [hover, setHover] = useState(false);
  const books = useBooks();
  return (
    <Link
      className={"pbw-cs pbw-in" + (c.wide ? " pbw-cs--wide" : "")}
      href={href}
      style={{ animationDelay: 0.12 + Math.min(i, 6) * 0.07 + "s" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="pbw-cs__art" style={{ background: c.wide ? "#0f0f0f" : "#111" }}>
        <div className="pbw-cs__stack">
          {c.covers.map((ci, j) => {
            const cov: LandingBook = books[ci % books.length];
            const n = c.covers.length;
            const off = j - (n - 1) / 2;
            return (
              <div
                key={j}
                style={{
                  position: "absolute", left: "50%", top: "50%",
                  width: c.wide ? 108 : 88, aspectRatio: "2/3",
                  background: coverBg(cov), borderRadius: 5,
                  display: "flex", alignItems: "flex-end", padding: 8,
                  fontFamily: '"Playfair Display", serif', fontWeight: 600,
                  fontSize: 9, lineHeight: 1.2, whiteSpace: "pre-line",
                  color: "rgba(255,255,255,.8)",
                  boxShadow: "0 20px 44px rgba(0,0,0,.55), inset 0 0 0 1px rgba(255,255,255,.07)",
                  transform: `translate(-50%,-50%) translate3d(${off * (hover ? 58 : 40)}px,${Math.abs(off) * 9}px,${-Math.abs(off) * 30}px) rotateZ(${off * 5}deg)`,
                  transition: "transform .55s cubic-bezier(.2,.8,.2,1)",
                }}
              >
                {j === n - 1 && !cov.src ? cov.t : ""}
              </div>
            );
          })}
        </div>
      </div>
      <div className="pbw-cs__body">
        <div className="pbw-cs__tag">{c.tag}</div>
        <div className="pbw-cs__ttl">{c.ttl}</div>
        <p className="pbw-cs__p">{c.p}</p>
        <div className="pbw-cs__lift">
          <b>{c.lift}</b><span>{c.liftL}</span>
          <span className="pbw-cs__go">Read case {PBW_ARROW}</span>
        </div>
      </div>
    </Link>
  );
}

export function CasesGrid({ cases = PBW_CASES, hrefBase = "/case-studies" }: { cases?: CaseStudy[]; hrefBase?: string }) {
  return (
    <div className="pbw-cs-grid">
      {cases.map((c, i) => (
        <CaseCard key={c.slug} c={c} i={i} href={`${hrefBase}#${c.slug}`} />
      ))}
    </div>
  );
}

// ── 3D spine stack (FAQ category switcher) ────────────────────────────────────

export function SpineStack({ active, onPick, height }: { active: string; onPick: (k: string) => void; height?: number }) {
  const [ref, vars] = useTilt({ ampX: 8, ampY: 15, baseX: 4, baseY: -6 });
  const books = useBooks();
  return (
    <div className="pbw-spines" ref={ref} style={height ? { height } : undefined}>
      <div className="pbw-spines__stage" style={vars}>
        {PBW_CATS.map((c, i) => {
          const n = PBW_CATS.length;
          const off = i - (n - 1) / 2;
          const on = active === c.k;
          const count = PBW_QS.filter((q) => q.c === c.k).length;
          const cov: LandingBook = books[c.cover % books.length];
          return (
            <button
              key={c.k}
              type="button"
              className="pbw-spine"
              aria-pressed={on}
              onClick={() => onPick(c.k)}
              style={{
                // Jacket art fills the spine; the scrim keeps the label legible.
                background: `linear-gradient(90deg,rgba(0,0,0,.80),rgba(0,0,0,.48)), ${coverBg(cov)}`,
                top: -23,
                transform: `translateY(${off * 54}px) translateZ(${on ? 68 : 0}px) rotateY(${on ? 0 : -6}deg)`,
                boxShadow: on ? "0 26px 50px rgba(0,0,0,.4)" : "0 14px 30px rgba(0,0,0,.24)",
                outline: on ? "1.5px solid rgba(255,255,255,.5)" : "none",
                zIndex: n - i,
              }}
            >
              <div
                aria-hidden
                style={{
                  width: 24, height: 36, flexShrink: 0, borderRadius: 2,
                  background: coverBg(cov),
                  boxShadow: "0 3px 8px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.14)",
                }}
              />
              <span className="pbw-spine__t">{c.l}</span>
              <span className="pbw-spine__n">{String(count).padStart(2, "0")}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Accordion ─────────────────────────────────────────────────────────────────

type Q = { c: string; q: string; a: string; top?: boolean };

function Question({ q, idx, open, onToggle }: { q: Q; idx: number; open: boolean; onToggle: () => void }) {
  const inner = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  useEffect(() => {
    if (!inner.current) return;
    const measure = () => setH(inner.current?.scrollHeight ?? 0);
    measure();
    const t = setTimeout(measure, 300);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); };
  }, [q.a]);
  return (
    <div className="pbw-q" data-open={open ? "1" : "0"}>
      <button className="pbw-q__btn" onClick={onToggle} aria-expanded={open}>
        <span className="pbw-q__idx">{String(idx + 1).padStart(2, "0")}</span>
        <span className="pbw-q__t">{q.q}</span>
        <span className="pbw-q__ico">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </span>
      </button>
      <div className="pbw-q__panel" style={{ height: open ? h : 0, opacity: open ? 1 : 0 }}>
        <div className="pbw-q__inner" ref={inner} dangerouslySetInnerHTML={{ __html: q.a }} />
      </div>
    </div>
  );
}

export function Accordion({ list, openFirst = true }: { list: Q[]; openFirst?: boolean }) {
  const [open, setOpen] = useState(openFirst ? 0 : -1);
  const firstQ = list[0]?.q;
  useEffect(() => { setOpen(openFirst ? 0 : -1); }, [list.length, firstQ, openFirst]);
  return (
    <div className="pbw-faq">
      {list.map((q, i) => (
        <Question key={q.q} q={q} idx={i} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
      ))}
    </div>
  );
}

// ── FAQ digest for the landing page ───────────────────────────────────────────

export function FAQDigest() {
  const [cat, setCat] = useState("top");
  const list = cat === "top" ? PBW_QS.filter((q) => q.top) : PBW_QS.filter((q) => q.c === cat);
  const label = cat === "top" ? "Most asked" : PBW_CATS.find((c) => c.k === cat)!.l;
  return (
    <div className="pbw-faq-split">
      <div>
        <div className="pbw-kicker">Questions</div>
        <h2 className="pbw-h2" style={{ marginTop: 16 }}>Before you<br /><em>make a shelf.</em></h2>
        <p className="pbw-p" style={{ maxWidth: 380, marginTop: 18 }}>
          Pull a spine off the stack to jump to a topic — or read all fifteen answers.
        </p>
        <SpineStack active={cat} onPick={(k) => setCat(k === cat ? "top" : k)} height={330} />
        <Link className="pbw-pill pbw-pill--ghost" href="/faq">All fifteen questions {PBW_ARROW}</Link>
      </div>
      <div>
        <div className="pbw-faq-split__label">
          <span>{label}</span><span>{String(list.length).padStart(2, "0")} answers</span>
        </div>
        <Accordion list={list} />
      </div>
    </div>
  );
}

// ── Help band (shared by the FAQ page and the landing page) ───────────────────

export function HelpBand() {
  const cards = [
    { t: "Email me", p: "One person builds this, and the same person answers. No ticket numbers.", l: "hridyesh@paperboxd.in", h: "mailto:hridyesh@paperboxd.in", external: true },
    { t: "Vibe search", p: "Faster than a help centre for anything about books rather than billing.", l: "Open search", h: "/search", external: false },
    { t: "Read the research", p: "What publishers, libraries and creators are already proving about readers.", l: "Ten write-ups", h: "/case-studies", external: false },
  ];
  return (
    <div className="pbw-help">
      {cards.map((c) =>
        c.external ? (
          <a key={c.t} className="pbw-help__card" href={c.h}>
            <div className="pbw-help__t">{c.t}</div>
            <div className="pbw-help__p">{c.p}</div>
            <div className="pbw-help__l">{c.l} →</div>
          </a>
        ) : (
          <Link key={c.t} className="pbw-help__card" href={c.h}>
            <div className="pbw-help__t">{c.t}</div>
            <div className="pbw-help__p">{c.p}</div>
            <div className="pbw-help__l">{c.l} →</div>
          </Link>
        )
      )}
    </div>
  );
}
