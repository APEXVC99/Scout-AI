import { createFileRoute, Link } from "@tanstack/react-router";
import { getExistingMemo, type DealMemoData } from "./-memo-actions";

export const Route = createFileRoute("/app/memos/$matchId")({
  loader: async ({ params }) => {
    try {
      const result = await getExistingMemo({ data: { matchId: params.matchId } });
      return { memo: result.memo };
    } catch {
      return { memo: null as DealMemoData | null };
    }
  },
  component: MemoDetailPage,
});

function recommendationBadgeClass(recommendation: string): string {
  switch (recommendation.toLowerCase()) {
    case "strong_buy":
    case "strong buy":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "buy":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "hold":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "pass":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

function recommendationLabel(recommendation: string): string {
  switch (recommendation.toLowerCase()) {
    case "strong_buy":
      return "Strong Buy";
    case "buy":
      return "Buy";
    case "hold":
      return "Hold";
    case "pass":
      return "Pass";
    default:
      return recommendation;
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function scoreColor(score: number): string {
  if (score >= 8) return "text-green-600 dark:text-green-400";
  if (score >= 6) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

/**
 * Simple Markdown-to-JSX renderer for deal memo content.
 * Renders headings, paragraphs, bold, italic, lists, and code blocks.
 */
function renderMemoContent(markdown: string): React.ReactNode {
  // Remove the trailing JSON block before rendering
  const cleanMarkdown = markdown.replace(/```json[\s\S]*?```/g, "").trim();

  const lines = cleanMarkdown.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // Skip empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Headings
    const h1Match = line.match(/^# (.+)/);
    if (h1Match) {
      elements.push(
        <h2 key={key++} className="mt-8 mb-3 text-xl font-bold text-gray-900 dark:text-white">
          {h1Match[1]}
        </h2>,
      );
      i++;
      continue;
    }

    const h2Match = line.match(/^## (.+)/);
    if (h2Match) {
      elements.push(
        <h3 key={key++} className="mt-6 mb-2 text-lg font-semibold text-gray-900 dark:text-white">
          {h2Match[1]}
        </h3>,
      );
      i++;
      continue;
    }

    const h3Match = line.match(/^### (.+)/);
    if (h3Match) {
      elements.push(
        <h4 key={key++} className="mt-4 mb-2 text-base font-medium text-gray-900 dark:text-white">
          {h3Match[1]}
        </h4>,
      );
      i++;
      continue;
    }

    // Unordered list items
    if (line.match(/^[\s]*[-*]\s/)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && lines[i]?.match(/^[\s]*[-*]\s/)) {
        const itemText = lines[i]!.replace(/^[\s]*[-*]\s/, "");
        listItems.push(
          <li key={key++} className="ml-4 list-disc text-sm text-gray-700 dark:text-gray-300">
            {renderInlineMarkdown(itemText)}
          </li>,
        );
        i++;
      }
      elements.push(
        <ul key={key++} className="my-2 space-y-1">
          {listItems}
        </ul>,
      );
      continue;
    }

    // Ordered list items
    if (line.match(/^[\s]*\d+\.\s/)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && lines[i]?.match(/^[\s]*\d+\.\s/)) {
        const itemText = lines[i]!.replace(/^[\s]*\d+\.\s/, "");
        listItems.push(
          <li key={key++} className="ml-4 list-decimal text-sm text-gray-700 dark:text-gray-300">
            {renderInlineMarkdown(itemText)}
          </li>,
        );
        i++;
      }
      elements.push(
        <ol key={key++} className="my-2 space-y-1">
          {listItems}
        </ol>,
      );
      continue;
    }

    // Code blocks
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i]?.startsWith("```")) {
        codeLines.push(lines[i]!);
        i++;
      }
      i++; // Skip closing ```
      elements.push(
        <pre
          key={key++}
          className="my-3 overflow-x-auto rounded-lg bg-gray-100 p-4 text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-200"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // Bold text on its own line (like "**Key takeaway:**")
    if (line.match(/^\*\*.*\*\*$/)) {
      const boldText = line.replace(/^\*\*(.*)\*\*$/, "$1");
      elements.push(
        <p key={key++} className="my-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
          {boldText}
        </p>,
      );
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key++} className="my-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        {renderInlineMarkdown(line)}
      </p>,
    );
    i++;
  }

  return <div>{elements}</div>;
}

/**
 * Simple inline markdown renderer for bold, italic, and inline code.
 */
function renderInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Bold+italic: ***text***
  remaining = remaining.replace(/\*\*\*(.+?)\*\*\*/g, (_, content) => {
    const idx = key++;
    parts.push(
      <strong key={`bi-${idx}`} className="font-semibold italic">
        {content}
      </strong>,
    );
    return `\0BIPLACEHOLDER${idx}\0`;
  });

  // Bold: **text**
  remaining = remaining.replace(/\*\*(.+?)\*\*/g, (_, content) => {
    const idx = key++;
    parts.push(
      <strong key={`b-${idx}`} className="font-semibold">
        {content}
      </strong>,
    );
    return `\0BPLACEHOLDER${idx}\0`;
  });

  // Italic: *text*
  remaining = remaining.replace(/\*(.+?)\*/g, (_, content) => {
    const idx = key++;
    parts.push(
      <em key={`i-${idx}`} className="italic">
        {content}
      </em>,
    );
    return `\0IPLACEHOLDER${idx}\0`;
  });

  // Inline code: `text`
  remaining = remaining.replace(/`(.+?)`/g, (_, content) => {
    const idx = key++;
    parts.push(
      <code
        key={`c-${idx}`}
        className="rounded bg-gray-100 px-1 py-0.5 text-xs text-pink-600 dark:bg-gray-800 dark:text-pink-400"
      >
        {content}
      </code>,
    );
    return `\0CPLACEHOLDER${idx}\0`;
  });

  // Only return plain text if no placeholders
  if (parts.length === 0) return remaining;

  // Build interleaved array of text + placeholders
  const result: React.ReactNode[] = [];
  const segments = remaining.split(/\0[BI]PLACEHOLDER\d+\0|\0CPLACEHOLDER\d+\0/);
  const placeholders = remaining.match(/\0[BI]PLACEHOLDER\d+\0|\0CPLACEHOLDER\d+\0/g) || [];

  for (let i = 0; i < segments.length; i++) {
    if (segments[i]) result.push(segments[i]);
    if (placeholders[i]) {
      const phIdx = parseInt(placeholders[i]!.match(/\d+/)![0]);
      result.push(parts[phIdx]);
    }
  }

  return <>{result}</>;
}

function MemoDetailPage() {
  const { memo } = Route.useLoaderData();

  if (!memo) {
    return (
      <div>
        <div className="mb-6">
          <Link
            to="/app/memos"
            className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            ← Back to Memos
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-16 text-center dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Memo Not Found
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            This memo may have been deleted or the match doesn't have a memo yet.
          </p>
          <Link
            to="/app/matches"
            className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            Go to Matches
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <div className="mb-6">
        <Link
          to="/app/memos"
          className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Memos
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {memo.companyName}
          </h1>
          <span
            className={`inline-flex items-center rounded-lg px-3 py-1 text-sm font-semibold ${recommendationBadgeClass(memo.recommendation)}`}
          >
            {recommendationLabel(memo.recommendation)}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Thesis: {memo.thesisName}
        </p>
      </div>

      {/* Score Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Team", value: memo.scores.team },
          { label: "Market", value: memo.scores.market },
          { label: "Traction", value: memo.scores.traction },
          { label: "Overall", value: memo.scores.overall },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {s.label}
            </p>
            <p className={`mt-1 text-2xl font-bold ${scoreColor(s.value)}`}>
              {s.value}
              <span className="text-sm font-normal text-gray-400">/10</span>
            </p>
          </div>
        ))}
      </div>

      {/* SWOT Sections */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
          <h3 className="text-sm font-semibold text-green-800 dark:text-green-200">Strengths</h3>
          <ul className="mt-2 space-y-1">
            {memo.swot.strengths.map((s, i) => (
              <li key={i} className="text-sm text-green-700 dark:text-green-300">
                • {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">Weaknesses</h3>
          <ul className="mt-2 space-y-1">
            {memo.swot.weaknesses.map((s, i) => (
              <li key={i} className="text-sm text-red-700 dark:text-red-300">
                • {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">Opportunities</h3>
          <ul className="mt-2 space-y-1">
            {memo.swot.opportunities.map((s, i) => (
              <li key={i} className="text-sm text-blue-700 dark:text-blue-300">
                • {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
          <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">Threats</h3>
          <ul className="mt-2 space-y-1">
            {memo.swot.threats.map((s, i) => (
              <li key={i} className="text-sm text-yellow-700 dark:text-yellow-300">
                • {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Full Memo Content */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {renderMemoContent(memo.content)}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400 dark:text-gray-500">
        <span>
          Generated by {memo.aiModel} · {formatDate(memo.generatedAt)}
        </span>
        <span>{memo.aiTokens.toLocaleString()} tokens</span>
      </div>
    </div>
  );
}
