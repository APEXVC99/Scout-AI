import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  parseFrontmatter,
  renderMarkdown,
  readingTime,
  type BlogPost,
} from "./blog";

export type { BlogPost };

const CONTENT_DIR = join(process.cwd(), "content", "blog");

async function loadPost(slug: string): Promise<BlogPost | null> {
  try {
    const raw = await readFile(join(CONTENT_DIR, `${slug}.md`), "utf8");
    const { meta, body } = parseFrontmatter(raw);
    return {
      slug,
      ...meta,
      readingTime: readingTime(body),
      html: renderMarkdown(body),
    };
  } catch {
    return null;
  }
}

export async function getAllPosts(): Promise<BlogPost[]> {
  let files: string[];
  try {
    files = await readdir(CONTENT_DIR);
  } catch {
    return [];
  }
  const posts = await Promise.all(
    files
      .filter((f) => f.endsWith(".md"))
      .map((f) => loadPost(f.slice(0, -3)))
  );
  return posts
    .filter((p): p is BlogPost => p !== null)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  return loadPost(slug);
}
