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
      { property: "og:url", content: "https://www.getscoutai.app/blog" },
      { property: "og:image", content: "https://www.getscoutai.app/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Scout AI — Autonomous deal sourcing, 24/7" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Blog — Scout AI" },
      {
        name: "twitter:description",
        content:
          "Insights on AI-powered deal sourcing, solo GPs, and how autonomous agents are reshaping venture capital.",
      },
      { name: "twitter:image", content: "https://www.getscoutai.app/og-image.png" },
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
