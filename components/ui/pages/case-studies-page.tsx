"use client";

// /case-studies — 3D fanned case files with pointer parallax, count-up metrics
// band, tilting cover-stack cards, per-case detail sections, dark deep-dive
// with a 3D device. Port of the design prototype's web/case-studies.jsx.

import Link from "next/link";
import { BooksContext, useBooks, useLandingBooks, coverBg } from "@/components/ui/landing/books";
import { LandingNav, WebFooter, WEB_NAV_LINKS } from "@/components/ui/landing/web-chrome";
import { PBW_CASES, CasesGrid, MetricsBand, useTilt } from "@/components/ui/landing/web-sections";

function CaseFan() {
  const [ref, vars] = useTilt({ ampX: 7, ampY: 16, baseX: 6, baseY: -22 });
  const cards = [
    { z: -140, x: -46, y: 44, r: -9, tag: "Libraries", ttl: "OverDrive / Libby", big: "820M", foot: ["Digital checkouts", "2025"] },
    { z: -40, x: -14, y: 6, r: -4, tag: "Creators", ttl: "BookTok, Europe", big: "50M", foot: ["Books sold", "2025"] },
    { z: 90, x: 26, y: -40, r: 2, tag: "Audio", ttl: "US audiobook sales", big: "$2.43B", foot: ["Publishers Weekly", "2025"] },
  ];
  return (
    <div className="pbw-fan" ref={ref}>
      <div className="pbw-fan__stage" style={vars}>
        {cards.map((c, i) => (
          <div key={i} className="pbw-fan__card" style={{ transform: `translate3d(${c.x}px,${c.y}px,${c.z}px) rotateZ(${c.r}deg)`, zIndex: i }}>
            <div className="pbw-fan__tag">{c.tag}</div>
            <div className="pbw-fan__ttl">{c.ttl}</div>
            <div className="pbw-fan__big">{c.big}</div>
            <div className="pbw-fan__foot"><span>{c.foot[0]}</span><span>{c.foot[1]}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VibePhone() {
  const [ref, vars] = useTilt({ ampX: 6, ampY: 14, baseX: 5, baseY: -19 });
  const books = useBooks();
  const results = [0, 5, 9, 14, 2, 11];
  return (
    <div className="pbw-spot__art" ref={ref}>
      <div className="pbw-spot__phone" style={vars}>
        <div className="pbw-spot__screen">
          <div style={{ padding: "22px 16px 0" }}>
            <div style={{ fontFamily: '"Geist Mono", monospace', fontSize: 8.5, letterSpacing: ".2em", textTransform: "uppercase", color: "#aaa" }}>Vibe search</div>
            <div style={{ marginTop: 10, background: "#f5f5f5", borderRadius: 10, padding: "10px 12px", fontFamily: '"Playfair Display", serif', fontStyle: "italic", fontSize: 12.5, color: "#333", lineHeight: 1.35 }}>
              &ldquo;slow, cold, someone is quietly falling apart&rdquo;
            </div>
            <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", fontFamily: '"Geist Mono", monospace', fontSize: 8, letterSpacing: ".12em", color: "#bbb", textTransform: "uppercase" }}>
              <span>6 matches</span><span>Sorted by vibe</span>
            </div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {results.map((ri, i) => {
                const cov = books[ri % books.length];
                return (
                  <div key={i}>
                    <div style={{ aspectRatio: "2/3", background: coverBg(cov), borderRadius: 4, boxShadow: "0 6px 14px rgba(0,0,0,.2)" }} />
                    <div style={{ marginTop: 5, fontFamily: '"Playfair Display", serif', fontWeight: 600, fontSize: 8, lineHeight: 1.2, color: "#222", whiteSpace: "pre-line", overflow: "hidden" }}>{cov.title}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Spotlight() {
  return (
    <section className="pbw-band" data-nav-dark>
      <div className="pbw-wrap">
        <div className="pbw-spot">
          <div>
            <div className="pbw-kicker pbw-kicker--inv">Deep dive · 010</div>
            <h2 className="pbw-h2" style={{ color: "#fff", marginTop: 18 }}>Feelings,<br /><em>not genres.</em></h2>
            <p className="pbw-lede" style={{ color: "rgba(255,255,255,.6)" }}>
              The genre dropdown is a filing system. Nobody browses a library that way —
              they browse by the mood they&rsquo;re trying to get into. So PaperBoxd
              replaces the dropdown with a single open field.
            </p>
            <div style={{ marginTop: 34, borderLeft: "2px solid #d97757", paddingLeft: 22 }}>
              <p className="pbw-quote" style={{ margin: 0 }}>
                &ldquo;slow, cold, someone is quietly falling apart&rdquo;
              </p>
              <div className="pbw-quote__by">An actual search that works here</div>
            </div>
            <div className="pbw-chips-row">
              {["Vibe search", "Mood over genre", "One open field", "On the web today"].map((t) => (
                <span key={t} className="pbw-tag">{t}</span>
              ))}
            </div>
          </div>
          <VibePhone />
        </div>
      </div>
    </section>
  );
}

function CaseDetails() {
  return (
    <div className="pbw-wrap" style={{ paddingBottom: 40 }}>
      {PBW_CASES.map((c, i) => (
        <article key={c.slug} id={c.slug} className="pbw-case">
          <div className="pbw-kicker">
            {String(i + 1).padStart(2, "0")} · {c.tag}
          </div>
          <h3 className="pbw-h2" style={{ marginTop: 14, maxWidth: 880 }}>{c.ttl}</h3>
          <div className="pbw-case__grid">
            <div className="pbw-case__block">
              <h4>The challenge</h4>
              <p>{c.challenge}</p>
              <h4>{c.planned ? "What PaperBoxd will do" : "What PaperBoxd does"}</h4>
              <p>{c.approach}</p>
            </div>
            <div className="pbw-case__block">
              <h4>The evidence</h4>
              <p>{c.precedent}</p>
              <div className="pbw-case__stats">
                {c.metrics.map((m) => (
                  <div key={m.l} className="pbw-case__stat">
                    <b>{m.n}</b>
                    <span>{m.l}</span>
                  </div>
                ))}
              </div>
              <div className="pbw-case__links">
                {c.links.map((l) => (
                  <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">
                    Further reading — {l.label} ↗
                  </a>
                ))}
              </div>
            </div>
          </div>
        </article>
      ))}
      <p className="pbw-p" style={{ maxWidth: 760, marginTop: 48, fontSize: 13, opacity: 0.6 }}>
        The organisations named on this page are not affiliated with PaperBoxd and have
        not endorsed it. Every figure is published third-party reporting, linked at the
        point it is used, and accurate as of the date of that source. Company and product
        names are the trademarks of their respective owners, referred to here only to
        describe their published work.
      </p>
    </div>
  );
}

export function CaseStudiesPage() {
  const { books } = useLandingBooks();
  return (
    <BooksContext.Provider value={books}>
      <LandingNav links={WEB_NAV_LINKS} active="Research" />
      <main className="pbw-page">
        <section className="pbw-cs-hero">
          <div className="pbw-wrap">
            <div className="pbw-cs-hero__grid">
              <div>
                <div className="pbw-kicker">Research</div>
                <h1 className="pbw-h1" style={{ marginTop: 20 }}>What happens<br />when <em>taste</em><br />gets a shelf.</h1>
                <p className="pbw-p" style={{ maxWidth: 460, marginTop: 24 }}>
                  Ten things publishers, libraries and creators have already proved
                  about readers — and what each one changed about how PaperBoxd is
                  built. Every figure here is somebody else&rsquo;s, and cited.
                </p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 30 }}>
                  <a className="pbw-pill pbw-pill--primary" href="#cases">
                    Browse the ten
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 13l7 7 7-7" /></svg>
                  </a>
                  <a className="pbw-pill pbw-pill--ghost" href="#partner">Get in touch</a>
                </div>
              </div>
              <CaseFan />
            </div>
          </div>
        </section>

        <div className="pbw-wrap">
          <MetricsBand />
          <p className="pbw-kicker" style={{ marginTop: 18, opacity: 0.7, maxWidth: 760 }}>
            Figures published by OverDrive, TikTok and the Audio Publishers Association.
            Sources linked with each write-up below.
          </p>
        </div>

        <section className="pbw-wrap" id="cases" style={{ padding: "96px 24px 110px" }}>
          <div className="pbw-kicker">Selected reading</div>
          <h2 className="pbw-h2" style={{ marginTop: 16 }}>Ten shelves,<br /><em>ten arguments.</em></h2>
          <CasesGrid hrefBase="" />
        </section>

        <CaseDetails />

        <Spotlight />

        <section className="pbw-wrap" id="partner" style={{ padding: "110px 24px 120px", textAlign: "center" }}>
          <div className="pbw-kicker">Get in touch</div>
          <h2 className="pbw-h2" style={{ marginTop: 16 }}>One person<br /><em>builds this.</em></h2>
          <p className="pbw-p" style={{ maxWidth: 480, margin: "22px auto 0" }}>
            No team, no partnerships, no roadmap I can promise you. If something here
            is wrong, or you want a shelf PaperBoxd doesn&rsquo;t have yet, the email
            goes straight to me.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 30 }}>
            <a className="pbw-pill pbw-pill--primary" href="mailto:hridyesh@paperboxd.in?subject=PaperBoxd">Start a conversation</a>
            <Link className="pbw-pill pbw-pill--ghost" href="/faq">Read the FAQ</Link>
          </div>
        </section>
      </main>
      <WebFooter />
    </BooksContext.Provider>
  );
}
