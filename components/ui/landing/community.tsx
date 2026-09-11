"use client";

// "This week on Paperboxd" — the only landing section built from live
// community data. Every block renders only when the snapshot has enough rows
// to be worth showing; nothing here is illustrative.

import Link from "next/link";
import { useCommunity, type CommunityBook, type CommunityList, type CommunityReader } from "@/hooks/use-community";

const MONO = '"Geist Mono", monospace';
const SERIF = '"cofo-glassier", "Playfair Display", serif';

function hue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

function Cover({ src, title, width, radius = 4 }: { src: string; title: string; width: number; radius?: number }) {
  return (
    <div
      style={{
        width,
        aspectRatio: "2/3",
        borderRadius: radius,
        flexShrink: 0,
        overflow: "hidden",
        background: src ? `center / cover no-repeat url("${src}")` : `hsl(${hue(title)},35%,45%)`,
        boxShadow: "0 6px 16px rgba(0,0,0,.14)",
      }}
      aria-label={title}
    />
  );
}

function Avatar({ src, name, size }: { src: string | null; name: string; size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        flexShrink: 0,
        overflow: "hidden",
        background: src ? `center / cover no-repeat url("${src}")` : `hsl(${hue(name)},45%,55%)`,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 600,
      }}
    >
      {src ? "" : name.charAt(0).toUpperCase()}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)", marginBottom: 14 }}>
      {children}
    </div>
  );
}

function TrendingRow({ books, title, caption }: { books: CommunityBook[]; title: string; caption: (b: CommunityBook) => string | null }) {
  return (
    <div>
      <Eyebrow>{title}</Eyebrow>
      <div className="lp-comm-row">
        {books.map((b) => (
          <Link key={b.id} href={`/b/${b.slug}`} style={{ textDecoration: "none", color: "inherit", width: 132, flexShrink: 0 }}>
            <Cover src={b.cover} title={b.title} width={132} radius={6} />
            <div style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 600, lineHeight: 1.2, marginTop: 10, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {b.title}
            </div>
            <div style={{ fontSize: 11.5, color: "rgba(0,0,0,0.5)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.author}</div>
            {caption(b) && (
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em", color: "rgba(0,0,0,0.45)", marginTop: 6 }}>{caption(b)}</div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

function ListCard({ list }: { list: CommunityList }) {
  const covers = list.coverUrls.slice(0, 3);
  return (
    <Link
      href={`/u/${list.username}/lists/${list.id}`}
      style={{ textDecoration: "none", color: "inherit", display: "flex", gap: 16, padding: 16, borderRadius: 16, border: "1px solid #ececec", background: "#fff", alignItems: "center" }}
    >
      <div style={{ position: "relative", width: 96, height: 92, flexShrink: 0 }}>
        {covers.map((c, i) => (
          <div key={i} style={{ position: "absolute", left: i * 18, top: i * 4, zIndex: 3 - i }}>
            <Cover src={c} title={list.title} width={56} />
          </div>
        ))}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 600, lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{list.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <Avatar src={list.ownerAvatar} name={list.ownerName} size={20} />
          <span style={{ fontSize: 12, color: "rgba(0,0,0,0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{list.ownerName}</span>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em", color: "rgba(0,0,0,0.45)", marginTop: 6 }}>
          {list.bookCount} books{list.saveCount > 0 ? ` · saved ${list.saveCount}×` : ""}
        </div>
      </div>
    </Link>
  );
}

function ReaderCard({ reader }: { reader: CommunityReader }) {
  return (
    <Link
      href={`/u/${reader.username}`}
      style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: 12, padding: 16, borderRadius: 16, border: "1px solid #ececec", background: "#fff", width: 200, flexShrink: 0 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar src={reader.avatar} name={reader.name} size={36} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{reader.name}</div>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em", color: "rgba(0,0,0,0.45)" }}>
            {reader.booksReadCount} read{reader.followersCount > 0 ? ` · ${reader.followersCount} followers` : ""}
          </div>
        </div>
      </div>
      {reader.favoriteCovers.length > 0 ? (
        <div style={{ display: "flex", gap: 6 }}>
          {reader.favoriteCovers.slice(0, 4).map((c, i) => (
            <Cover key={i} src={c} title={reader.name} width={36} radius={3} />
          ))}
        </div>
      ) : reader.bio ? (
        <div style={{ fontSize: 12.5, color: "rgba(0,0,0,0.55)", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{reader.bio}</div>
      ) : null}
    </Link>
  );
}

export function LandingCommunity() {
  const { community, loaded } = useCommunity();
  const trending = community.trendingBooks.filter((b) => b.cover);
  const popular = community.popularBooks.filter((b) => b.cover);
  const books = trending.length >= 4 ? trending : popular;
  const isTrending = trending.length >= 4;
  const rising = community.rising.filter((b) => b.cover).slice(0, 12);
  const mostTbr = community.mostTbr.filter((b) => b.cover).slice(0, 12);
  const lists = community.lists.filter((l) => l.coverUrls.length > 0).slice(0, 4);
  const readers = community.readers.slice(0, 6);

  const showBooks = books.length >= 4;
  const showLists = lists.length >= 2;
  const showReaders = readers.length >= 3;
  if (!loaded || (!showBooks && !showLists && !showReaders)) return null;

  return (
    <section id="this-week" style={{ position: "relative", padding: "40px 24px 120px", maxWidth: 1240, margin: "0 auto" }}>
      <style>{`
        .lp-comm-row { display: flex; gap: 20px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none; }
        .lp-comm-row::-webkit-scrollbar { display: none; }
        .lp-comm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 900px) { .lp-comm-grid { grid-template-columns: 1fr; } }
        .lp-comm-in { animation: lpCommIn .6s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes lpCommIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
      `}</style>
      <div className="lp-comm-in">
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)", marginBottom: 18 }}>
          Live from the shelves
        </div>
        <h2 style={{ fontFamily: SERIF, fontSize: "clamp(36px, 5.5vw, 76px)", lineHeight: 1.02, letterSpacing: "-0.025em", fontWeight: 600, margin: 0 }}>
          This week
          <br />
          <em style={{ fontStyle: "italic", fontWeight: 400, color: "rgba(0,0,0,0.5)" }}>on Paperboxd.</em>
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 56, marginTop: 56 }}>
          {showBooks && (
            <TrendingRow
              books={books.slice(0, 12)}
              title={isTrending ? "Trending this week" : "Most visited"}
              caption={(b) => (isTrending && b.adds7d >= 2 ? `shelved by ${b.adds7d} readers` : null)}
            />
          )}
          {rising.length >= 4 && (
            <TrendingRow
              books={rising}
              title="Rising this week"
              caption={(b) => b.label ?? null}
            />
          )}
          {mostTbr.length >= 4 && (
            <TrendingRow
              books={mostTbr}
              title="Most added to TBR"
              caption={(b) => b.label ?? null}
            />
          )}
          {showLists && (
            <div>
              <Eyebrow>Lists worth saving</Eyebrow>
              <div className="lp-comm-grid">
                {lists.map((l) => <ListCard key={l.id} list={l} />)}
              </div>
            </div>
          )}
          {showReaders && (
            <div>
              <Eyebrow>Readers to follow</Eyebrow>
              <div className="lp-comm-row">
                {readers.map((r) => <ReaderCard key={r.username} reader={r} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
