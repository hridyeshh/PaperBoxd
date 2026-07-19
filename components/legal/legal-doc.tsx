import fs from "node:fs";
import path from "node:path";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Flip to false once the [PLACEHOLDER] blocks are filled (effective date,
// full legal name, data-residency regions) and the §12 arbitration decision
// is made. When false, also set robots.index = true in the route metadata.
const DRAFT = true;

// The canonical documents are authored in `paperboxd-backend/docs/*.md` and
// copied here (separate repo — Vercel only builds this repo, so it can't read
// the backend copy). ponytail: two copies until legal text stabilizes; if it
// starts drifting, serve it from the Go backend over an API instead.
function loadLegal(slug: string): { title: string; body: string } {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "content/legal", `${slug}.md`),
    "utf8",
  );
  const title = raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";
  const body = raw
    // Drop the internal "Outstanding placeholders" checklist — not public.
    .split(/\n##\s+Outstanding placeholders/i)[0]
    // Drop the title + the reviewer-facing preamble (effective date, version,
    // "generated from a code-level audit" note) up to the first horizontal rule.
    .replace(/^[\s\S]*?\n---\n/, "")
    .replace(/\n---\s*$/, "")
    .trim();
  return { title, body };
}

const components: Components = {
  h2: ({ children }) => (
    <h2 className="mt-10 mb-3 text-xl font-semibold text-foreground">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 mb-2 text-lg font-semibold text-foreground">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mt-4 leading-relaxed text-muted-foreground">{children}</p>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-primary underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="mt-4 ml-6 list-disc space-y-1.5 text-muted-foreground">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-4 ml-6 list-decimal space-y-1.5 text-muted-foreground">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-4 border-l-2 border-border pl-4 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-10 border-border" />,
  table: ({ children }) => (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border px-3 py-2 text-left font-semibold text-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-3 py-2 align-top text-muted-foreground">
      {children}
    </td>
  ),
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 text-sm">{children}</code>
  ),
};

export function LegalDoc({ slug }: { slug: string }) {
  const { title, body } = loadLegal(slug);
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-foreground sm:py-16">
      {DRAFT && (
        <div className="mb-8 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          <strong className="font-semibold">Draft — not yet in effect.</strong> This
          document is under review and is not legally binding until an effective date is
          published.
        </div>
      )}
      <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {body}
      </ReactMarkdown>
    </main>
  );
}
