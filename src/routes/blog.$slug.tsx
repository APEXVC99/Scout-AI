import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getPostBySlug, type BlogPost } from "~/lib/blog-server";
import { formatDate } from "~/lib/blog";

const loadPost = createServerFn({ method: "GET" })
  .validator((input: unknown) => {
    if (typeof input !== "object" || input === null || !("slug" in input)) {
      throw new Error("Invalid input");
    }
    const { slug } = input as { slug: unknown };
    if (typeof slug !== "string") throw new Error("slug must be a string");
    return { slug };
  })
  .handler(async ({ data }) => {
    return getPostBySlug(data.slug);
  });

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => loadPost({ data: { slug: params.slug } }),
  head: ({ loaderData }) => {
    const post = loaderData as BlogPost | null;
    const title = post ? `${post.title} — Scout AI Blog` : "Post not found — Scout AI";
    const description =
      post?.description || post?.excerpt || "Scout AI blog post.";
    const url = post ? `https://www.getscoutai.app/blog/${post.slug}` : "https://www.getscoutai.app/blog";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: "https://www.getscoutai.app/og-image.png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: "Scout AI — Autonomous deal sourcing, 24/7" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: "https://www.getscoutai.app/og-image.png" },
      ],
    };
  },
  notFoundComponent: () => <PostNotFound />,
  component: BlogPostPage,
});

function BlogPostPage() {
  const post = Route.useLoaderData();
  if (!post) return <PostNotFound />;

  return (
    <article className="px-6 pt-16 pb-24">
        <div className="mx-auto max-w-3xl">
          <Link
            to="/blog"
            className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to blog
          </Link>

          <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              {formatDate(post.date)}
            </span>
            <span>·</span>
            <span>{post.readingTime}</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-gray-50">
            {post.title}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
            {post.description}
          </p>

          <div className="section-divider my-10" aria-hidden />

          <div
            className="prose-blog"
            dangerouslySetInnerHTML={{ __html: post.html }}
          />

          <div className="mt-14 rounded-2xl border border-indigo-100/80 bg-white/60 p-8 text-center dark:border-indigo-950 dark:bg-white/5">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-50">
              See every deal that fits your thesis
            </h3>
            <p className="mx-auto mt-2 max-w-md text-gray-600 dark:text-gray-400">
              Scout AI sources, scores, and drafts outreach around the clock —
              for less than a junior analyst's stipend.
            </p>
            <Link
              to="/sign-up"
              className="btn-gradient mt-5 inline-block rounded-full px-6 py-2.5 text-sm font-semibold"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </article>
  );
}

function PostNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <p className="text-6xl">🔍</p>
        <h1 className="mt-4 text-2xl font-bold">Post not found</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          The article you're looking for doesn't exist or has moved.
        </p>
        <Link
          to="/blog"
          className="btn-gradient mt-6 rounded-full px-6 py-2.5 text-sm font-semibold"
        >
          Back to the blog
        </Link>
    </div>
  );
}
