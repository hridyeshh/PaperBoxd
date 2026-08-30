"use client";

// /faq — 3D book-spine category switcher, searchable height-animated accordion,
// dark help band. Port of the design prototype's web/faq.jsx.

import { useState } from "react";
import { BooksContext, useLandingBooks } from "@/components/ui/landing/books";
import { LandingNav, WebFooter, WEB_NAV_LINKS } from "@/components/ui/landing/web-chrome";
import { PBW_QS, PBW_CATS, Accordion, SpineStack, HelpBand } from "@/components/ui/landing/web-sections";

export function FAQPage() {
  const { books } = useLandingBooks();
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");

  const list = PBW_QS.filter(
    (q) =>
      (cat === "all" || q.c === cat) &&
      (!query.trim() || (q.q + " " + q.a).toLowerCase().includes(query.trim().toLowerCase()))
  );

  return (
    <BooksContext.Provider value={books}>
      <LandingNav links={WEB_NAV_LINKS} active="FAQ" />
      <main className="pbw-page">
        <section className="pbw-faq-hero">
          <div className="pbw-wrap">
            <div className="pbw-faq-hero__grid">
              <div>
                <div className="pbw-kicker">Frequently asked</div>
                <h1 className="pbw-h1" style={{ marginTop: 20 }}>Everything you<br />wanted to ask<br /><em>about your shelf.</em></h1>
                <p className="pbw-p" style={{ maxWidth: 440, marginTop: 22 }}>
                  Fifteen answers, no support-ticket voice. Pull a spine off the stack,
                  or search for the thing you&rsquo;re actually wondering.
                </p>
                <div style={{ marginTop: 28, position: "relative", maxWidth: 400 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="2.2" strokeLinecap="round" style={{ position: "absolute", left: 16, top: 15 }}>
                    <circle cx="11" cy="11" r="7" /><path d="M20 20l-4.3-4.3" />
                  </svg>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search the FAQ…"
                    aria-label="Search the FAQ"
                    style={{ width: "100%", padding: "13px 16px 13px 42px", borderRadius: 999, border: "1px solid rgba(0,0,0,.14)", fontFamily: "inherit", fontSize: 14, color: "#111", outline: "none", background: "#fff" }}
                  />
                </div>
              </div>
              <SpineStack active={cat} onPick={(k) => setCat(k === cat ? "all" : k)} />
            </div>
          </div>
        </section>

        <section className="pbw-wrap" style={{ paddingBottom: 110 }}>
          <div className="pbw-chips">
            <button className="pbw-chip" aria-pressed={cat === "all"} onClick={() => setCat("all")}>All · {PBW_QS.length}</button>
            {PBW_CATS.map((c) => (
              <button key={c.k} className="pbw-chip" aria-pressed={cat === c.k} onClick={() => setCat(c.k)}>{c.l}</button>
            ))}
          </div>
          {list.length === 0 ? (
            <p className="pbw-p" style={{ padding: "40px 0" }}>
              Nothing matches &ldquo;{query}&rdquo;. Try <strong>export</strong>, <strong>streak</strong> or <strong>import</strong> — or ask us directly below.
            </p>
          ) : (
            <Accordion list={list} />
          )}
        </section>

        <section className="pbw-band" data-nav-dark>
          <div className="pbw-wrap">
            <div className="pbw-kicker pbw-kicker--inv">Still stuck</div>
            <h2 className="pbw-h2" style={{ color: "#fff", marginTop: 16 }}>Ask a human.<br /><em>One answers.</em></h2>
            <HelpBand />
          </div>
        </section>
      </main>
      <WebFooter />
    </BooksContext.Provider>
  );
}
