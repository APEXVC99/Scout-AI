import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getAllPosts } from "~/lib/blog-server";
import { formatDate } from "~/lib/blog";

const loadPosts = createServerFn({ method: "GET" }).handler(async () => {
  const posts = await getAllPosts();
  return posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    date: p.date,
    excerpt: p.excerpt,
    readingTime: p.readingTime,
  }));
});

export const Route = createFileRoute("/blog/")({
  loader: () => loadPosts(),
  component: BlogIndex,
});

function BlogIndex() {
  const posts = Route.useLoaderData();

  return (
    <>
      <section className="relative overflow-hidden px-6 pt-20 pb-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="animate-blob absolute -top-24 left-1/2 h-[380px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-400/25 via-violet-400/20 to-purple-400/25 blur-3xl dark:from-indigo-600/25 dark:via-violet-600/20 dark:to-purple-600/25" />
          <div className="animate-float absolute -right-16 top-32 h-[260px] w-[260px] rounded-full bg-gradient-to-bl from-fuchsia-300/20 to-violet-400/15 blur-3xl dark:from-fuchsia-600/15 dark:to-violet-700/15" />
        </div>
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="icon-chip-gradient mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide text-indigo-700 uppercase dark:text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500" />
            Scout AI Blog
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            <span className="text-gradient">Ideas on the future of deal flow</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
            Notes on AI-powered sourcing, the rise of the solo GP, and how
            smaller funds are outmaneuvering the giants.
          </p>
        </div>
      </section>

      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-4xl">
          {posts.length === 0 ? (
            <div className="card-gradient-border rounded-2xl p-10 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No posts yet — check back soon.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  to="/blog/$slug"
                  params={{ slug: post.slug }}
                  className="card-gradient-border card-lift group block rounded-2xl p-7"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      {formatDate(post.date)}
                    </span>
                    <span className="text-gray-400">·</span>
                    <span>{post.readingTime}</span>
                    <span className="ml-auto text-indigo-500 opacity-0 transition group-hover:opacity-100 dark:text-indigo-400">
                      Read →
                    </span>
                  </div>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 transition group-hover:text-indigo-700 dark:text-gray-50 dark:group-hover:text-indigo-300">
                    {post.title}
                  </h2>
                  <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-400">
                    {post.excerpt}
                  </p>
                  <p className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                    Read article
                    <svg className="h-4 w-4 transition group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
