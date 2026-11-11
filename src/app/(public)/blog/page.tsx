"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Calendar, Clock, ArrowRight, Sparkles, Filter } from "lucide-react";
import { BLOG_POSTS, BlogPost } from "@/content/blog-posts";
import { Badge } from "@/components/ui/badge";

export default function BlogIndexPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", "Engineering", "Methodology", "Product Design"];

  const filteredPosts =
    selectedCategory === "All"
      ? BLOG_POSTS
      : BLOG_POSTS.filter((post) => post.category === selectedCategory);

  return (
    <div className="bg-background text-foreground min-h-screen pb-20">
      {/* Header Banner */}
      <section className="relative overflow-hidden border-b border-border/80 dark:border-white/[0.08] bg-muted/20 py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_50%_at_50%_-20%,rgba(99,102,241,0.12),rgba(255,255,255,0))]" />

        <div className="container mx-auto px-4 max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-semibold tracking-wide text-primary mb-6 shadow-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Research & Engineering Dispatches</span>
          </div>

          <h1 className="mb-5 text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground">
            The Ithaca Field Journal
          </h1>

          <p className="text-muted-foreground mx-auto max-w-2xl text-lg sm:text-xl leading-relaxed">
            In-depth technical writeups on high-performance WebGL graphics, epistemic stance inference,
            and the future of computational literature synthesis.
          </p>

          {/* Category Filter Pills */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-4 py-1.5 text-xs font-mono font-medium transition-all ${
                  selectedCategory === category
                    ? "bg-foreground text-background shadow-xs font-semibold"
                    : "border border-border/80 dark:border-white/[0.08] bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="container mx-auto px-4 max-w-6xl py-14">
        {filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map((post) => (
              <ArticleCard key={post.slug} post={post} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-muted-foreground text-base">
              No articles found in this category.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function ArticleCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-border/80 dark:border-white/[0.08] bg-card/90 dark:bg-gradient-to-b dark:from-[#13141a]/90 dark:via-[#0e0f14]/90 dark:to-[#0a0b0e]/90 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/40 backdrop-blur-xl"
    >
      {/* Abstract Graphic Header */}
      <div className="relative aspect-video w-full overflow-hidden border-b border-border/60 dark:border-white/[0.06] bg-muted/30">
        <ArticleThumbnail category={post.category} />
        <div className="absolute top-3 left-3">
          <span
            className={`text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full border shadow-xs ${
              post.category === "Engineering"
                ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                : post.category === "Methodology"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-purple-500/30 bg-purple-500/10 text-purple-400"
            }`}
          >
            {post.category}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="text-muted-foreground mb-3 flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {post.date}
          </span>
          <span>&bull;</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {post.readTime}
          </span>
        </div>

        <h3 className="group-hover:text-primary mb-3 text-xl font-bold tracking-tight text-foreground transition-colors leading-snug">
          {post.title}
        </h3>

        <p className="text-muted-foreground mb-6 line-clamp-3 flex-1 text-sm leading-relaxed">
          {post.excerpt}
        </p>

        <div className="border-t border-border/60 dark:border-white/[0.06] mt-auto flex items-center justify-between pt-4">
          <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
            <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-mono text-primary font-bold">
              I
            </div>
            <span>{post.author}</span>
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-primary opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
            Read <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function ArticleThumbnail({ category }: { category: string }) {
  if (category === "Engineering") {
    return (
      <svg
        className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
        viewBox="0 0 400 225"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="400" height="225" fill="#0d0e12" />
        <circle cx="80" cy="112" r="6" fill="#3b82f6" />
        <circle cx="200" cy="60" r="10" fill="#60a5fa" />
        <circle cx="320" cy="112" r="6" fill="#3b82f6" />
        <circle cx="160" cy="170" r="8" fill="#93c5fd" />
        <circle cx="240" cy="160" r="7" fill="#2563eb" />
        <line x1="80" y1="112" x2="200" y2="60" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.4" />
        <line x1="200" y1="60" x2="320" y2="112" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.4" />
        <line x1="200" y1="60" x2="160" y2="170" stroke="#60a5fa" strokeWidth="2" strokeOpacity="0.6" />
        <line x1="160" y1="170" x2="240" y2="160" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.4" />
        <line x1="240" y1="160" x2="320" y2="112" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.4" />
        <circle cx="200" cy="60" r="22" stroke="#60a5fa" strokeWidth="1" strokeOpacity="0.25" strokeDasharray="3 3" />
      </svg>
    );
  }

  if (category === "Methodology") {
    return (
      <svg
        className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
        viewBox="0 0 400 225"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="400" height="225" fill="#0b0f0e" />
        <rect x="70" y="80" width="100" height="65" rx="10" fill="#10b981" fillOpacity="0.1" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.5" />
        <rect x="230" y="80" width="100" height="65" rx="10" fill="#f43f5e" fillOpacity="0.1" stroke="#f43f5e" strokeWidth="1.5" strokeOpacity="0.5" />
        <path d="M 170 112 Q 200 70 230 112" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" />
        <path d="M 170 120 Q 200 160 230 120" stroke="#f43f5e" strokeWidth="2" />
        <circle cx="200" cy="90" r="4" fill="#10b981" />
        <circle cx="200" cy="140" r="4" fill="#f43f5e" />
      </svg>
    );
  }

  return (
    <svg
      className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
      viewBox="0 0 400 225"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="400" height="225" fill="#0d0c14" />
      <rect x="60" y="45" width="280" height="135" rx="12" fill="#a855f7" fillOpacity="0.05" stroke="#a855f7" strokeWidth="1" strokeOpacity="0.3" />
      <rect x="80" y="65" width="160" height="95" rx="8" fill="#ffffff" fillOpacity="0.03" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.1" />
      <rect x="250" y="65" width="70" height="95" rx="8" fill="#a855f7" fillOpacity="0.15" stroke="#a855f7" strokeWidth="1" strokeOpacity="0.4" />
      <circle cx="120" cy="112" r="5" fill="#38bdf8" />
      <circle cx="170" cy="95" r="5" fill="#a855f7" />
      <line x1="120" y1="112" x2="170" y2="95" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.5" />
    </svg>
  );
}

