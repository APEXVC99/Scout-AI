export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO yyyy-mm-dd
  excerpt: string;
  readingTime: string;
}

export interface BlogPost extends BlogPostMeta {
  html: string;
}

/* ── Frontmatter ─────────────────────────────────────────────────── */

export function parseFrontmatter(raw: string): { meta: Omit<BlogPostMeta, "slug" | "readingTime">; body: string } {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!fm) {
    return { meta: { title: "Untitled", description: "", date: "", excerpt: "" }, body: raw };
  }
  const fields: Record<string, string> = {};
  for (const line of fm[1].split(/\r?\n/)) {
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (m) {
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      fields[m[1]] = v;
    }
  }
  return {
    meta: {
      title: fields.title?.trim() || "Untitled",
      description: fields.description?.trim() || "",
      date: fields.date?.trim() || "",
      excerpt: fields.excerpt?.trim() || "",
    },
    body: raw.slice(fm[0].length),
  };
}

/* ── Lightweight markdown → HTML ─────────────────────────────────── */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Inline formatting: **bold**, *italic*, `code`, [text](url). Operates on escaped text. */
function renderInline(line: string): string {
  let out = line;
  // code spans first (protect their content from later replacements)
  const codeSpans: string[] = [];
  out = out.replace(/`([^`]+)`/g, (_m, c) => {
    codeSpans.push(`<code>${c}</code>`);
    return `\u0000${codeSpans.length - 1}\u0000`;
  });
  // links
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_m, text, href) => {
      const safe = href.startsWith("http") ? href : href.startsWith("/") ? href : `/${href}`;
      const target = href.startsWith("http") ? ' target="_blank" rel="noopener noreferrer"' : "";
      return `<a href="${escapeHtml(safe)}"${target}>${text}</a>`;
    }
  );
  // bold
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // italic
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  // restore code spans
  out = out.replace(/\u0000(\d+)\u0000/g, (_m, i) => codeSpans[Number(i)]);
  return out;
}

export function renderMarkdown(md: string): string {
  const src = escapeHtml(md.replace(/\r\n/g, "\n"));

  const blocks: string[] = [];
  const lines = src.split("\n");
  let i = 0;

  const pushParagraph = (buf: string[]) => {
    if (buf.length) blocks.push(`<p>${buf.map(renderInline).join("<br/>")}</p>`);
    buf.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i];

    // fenced code block
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push(
        `<pre><code${lang ? ` class="language-${escapeHtml(lang)}"` : ""}>${buf.join("\n")}</code></pre>`
      );
      continue;
    }

    // headings
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      blocks.push(`<h${level}>${renderInline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // horizontal rule
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      blocks.push("<hr/>");
      i++;
      continue;
    }

    // blockquote
    if (/^\s*&gt;\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*&gt;\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*&gt;\s?/, ""));
        i++;
      }
      blocks.push(`<blockquote><p>${buf.map(renderInline).join("<br/>")}</p></blockquote>`);
      continue;
    }

    // unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        buf.push(`<li>${renderInline(lines[i].replace(/^\s*[-*+]\s+/, ""))}</li>`);
        i++;
      }
      blocks.push(`<ul>${buf.join("")}</ul>`);
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        buf.push(`<li>${renderInline(lines[i].replace(/^\s*\d+\.\s+/, ""))}</li>`);
        i++;
      }
      blocks.push(`<ol>${buf.join("")}</ol>`);
      continue;
    }

    // paragraph (accumulate until blank line or another block start)
    if (line.trim() !== "") {
      const buf: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        !/^```/.test(lines[i]) &&
        !/^#{1,6}\s/.test(lines[i]) &&
        !/^\s*[-*+]\s+/.test(lines[i]) &&
        !/^\s*\d+\.\s+/.test(lines[i]) &&
        !/^\s*&gt;\s?/.test(lines[i]) &&
        !/^\s*([-*_])\1{2,}\s*$/.test(lines[i])
      ) {
        buf.push(lines[i]);
        i++;
      }
      pushParagraph(buf);
      continue;
    }

    i++;
  }

  return blocks.join("\n");
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function readingTime(body: string): string {
  const words = body.split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}
