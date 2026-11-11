import Link from "next/link";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { notFound } from "next/navigation";
import { getBlogPost, BLOG_POSTS } from "@/content/blog-posts";

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const paragraphs = post.content.split("\n\n").filter((p) => p.trim());

  return (
    <article className="bg-background text-foreground animate-in fade-in min-h-screen duration-500">
      <div className="border-border bg-muted/10 border-b">
        <div className="container mx-auto max-w-4xl px-4 py-16">
          <Link
            href="/blog"
            className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center text-sm transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog
          </Link>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold tracking-wider text-blue-700 uppercase dark:bg-blue-900/30 dark:text-blue-300">
              {post.category}
            </div>
            <h1 className="text-4xl leading-tight font-extrabold tracking-tight md:text-5xl">
              {post.title}
            </h1>
            <div className="text-muted-foreground flex items-center gap-6 pt-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="text-foreground font-medium">
                  {post.author}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {post.date}
              </div>
              <div>{post.readTime}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="prose prose-slate dark:prose-invert prose-lg max-w-none">
          {paragraphs.map((block, i) => {
            const trimmed = block.trim();
            if (trimmed.startsWith("## ")) {
              return <h2 key={i}>{trimmed.slice(3)}</h2>;
            }
            if (trimmed.startsWith("### ")) {
              return <h3 key={i}>{trimmed.slice(4)}</h3>;
            }
            if (trimmed.startsWith("- ") || trimmed.startsWith("1. ")) {
              const items = trimmed.split("\n");
              const isOrdered = trimmed.startsWith("1. ");
              const Tag = isOrdered ? "ol" : "ul";
              return (
                <Tag key={i}>
                  {items.map((item, j) => (
                    <li key={j}>{item.replace(/^[-\d]+[.)]\s*/, "")}</li>
                  ))}
                </Tag>
              );
            }
            return <p key={i}>{trimmed}</p>;
          })}
        </div>
      </div>
    </article>
  );
}
