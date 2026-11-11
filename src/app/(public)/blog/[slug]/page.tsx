import Link from "next/link";
import { ArrowLeft, Calendar, User, Clock, Share2, Sparkles, ArrowRight, BookOpen } from "lucide-react";
import { notFound } from "next/navigation";
import { getBlogPost, BLOG_POSTS } from "@/content/blog-posts";
import { Button } from "@/components/ui/button";

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

function formatInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={index} className="italic text-foreground/90">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded-md border border-border bg-muted/80 px-1.5 py-0.5 font-mono text-xs text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
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

  // Other posts for "Read Next"
  const otherPosts = BLOG_POSTS.filter((p) => p.slug !== slug);

  return (
    <article className="bg-background text-foreground animate-in fade-in min-h-screen duration-500 pb-20">
      {/* Header Banner */}
      <div className="relative overflow-hidden border-b border-border/80 dark:border-white/[0.08] bg-muted/20 py-16">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_50%_at_50%_-20%,rgba(99,102,241,0.1),rgba(255,255,255,0))]" />

        <div className="container mx-auto max-w-4xl px-4">
          <Link
            href="/blog"
            className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center text-xs font-mono transition-colors"
          >
            <ArrowLeft className="mr-2 h-3.5 w-3.5" />
            Back to All Dispatches
          </Link>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-0.5 text-xs font-mono font-semibold text-primary">
              {post.category}
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
              {post.title}
            </h1>

            <div className="text-muted-foreground flex flex-wrap items-center gap-4 sm:gap-6 pt-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-mono text-primary font-bold">
                  I
                </div>
                <span className="text-foreground font-medium">{post.author}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{post.date}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{post.readTime}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto max-w-4xl px-4 py-12">
        {/* Key Takeaways Callout Box */}
        <div className="mb-10 rounded-2xl border border-primary/25 bg-primary/5 p-6 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-primary mb-2">
            <Sparkles className="h-4 w-4" />
            Core Synthesis
          </div>
          <p className="text-sm leading-relaxed text-foreground/90 font-sans">
            {post.excerpt}
          </p>
        </div>

        {/* Article Body */}
        <div className="prose prose-slate dark:prose-invert prose-lg max-w-none prose-headings:tracking-tight prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground">
          {paragraphs.map((block, i) => {
            const trimmed = block.trim();
            if (trimmed.startsWith("## ")) {
              return <h2 key={i}>{formatInlineMarkdown(trimmed.slice(3))}</h2>;
            }
            if (trimmed.startsWith("### ")) {
              return <h3 key={i}>{formatInlineMarkdown(trimmed.slice(4))}</h3>;
            }
            if (trimmed.startsWith("```")) {
              const codeLines = trimmed.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
              return (
                <div key={i} className="my-6 rounded-2xl border border-border/80 dark:border-white/[0.08] bg-card/90 dark:bg-[#0c0d11] p-5 font-mono text-xs overflow-x-auto shadow-inner">
                  <pre className="text-foreground leading-relaxed">
                    {codeLines}
                  </pre>
                </div>
              );
            }
            if (trimmed.startsWith("- ") || trimmed.startsWith("1. ")) {
              const items = trimmed.split("\n");
              const isOrdered = trimmed.startsWith("1. ");
              const Tag = isOrdered ? "ol" : "ul";
              return (
                <Tag key={i} className="my-4 space-y-2">
                  {items.map((item, j) => (
                    <li key={j} className="text-sm sm:text-base leading-relaxed">
                      {formatInlineMarkdown(item.replace(/^[-\d]+[.)]\s*/, ""))}
                    </li>
                  ))}
                </Tag>
              );
            }
            return (
              <p key={i} className="text-sm sm:text-base leading-relaxed text-muted-foreground">
                {formatInlineMarkdown(trimmed)}
              </p>
            );
          })}
        </div>

        {/* Author / Scientific Provenance Card */}
        <div className="mt-14 pt-8 border-t border-border/80 dark:border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center font-mono font-bold text-primary text-base">
              I
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">Written by the Ithaca Engineering Team</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Advancing computational meta-science & open epistemic graphs.
              </div>
            </div>
          </div>

          <Link href="/">
            <Button size="sm" className="gap-2 text-xs font-mono">
              Explore in Graph <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        {/* Read Next Section */}
        {otherPosts.length > 0 && (
          <div className="mt-16 pt-12 border-t border-border/80 dark:border-white/[0.08]">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground mb-6">
              More Dispatches
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {otherPosts.slice(0, 2).map((other) => (
                <Link
                  key={other.slug}
                  href={`/blog/${other.slug}`}
                  className="group rounded-2xl border border-border/80 dark:border-white/[0.08] bg-card/60 p-5 transition-all hover:border-primary/40 hover:-translate-y-0.5"
                >
                  <span className="text-[10px] font-mono font-semibold text-primary">
                    {other.category}
                  </span>
                  <h4 className="font-bold text-foreground group-hover:text-primary transition-colors text-base mt-1.5 mb-2 leading-snug">
                    {other.title}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {other.excerpt}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

