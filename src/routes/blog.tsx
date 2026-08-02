import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BlogFooter, BlogHeader } from "~/components/BlogShell";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Scout AI" },
      {
        name: "description",
        content:
          "Insights on AI-powered deal sourcing, solo GPs, and how autonomous agents are reshaping venture capital.",
      },
      { property: "og:title", content: "Blog — Scout AI" },
      {
        property: "og:description",
        content:
          "Insights on AI-powered deal sourcing, solo GPs, and how autonomous agents are reshaping venture capital.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://getscoutai.app/blog" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Blog — Scout AI" },
    ],
  }),
  component: BlogLayout,
});

function BlogLayout() {
  return (
    <div className="bg-page min-h-dvh text-gray-900 antialiased dark:text-gray-100">
      <BlogHeader />
      <Outlet />
      <BlogFooter />
    </div>
  );
}
