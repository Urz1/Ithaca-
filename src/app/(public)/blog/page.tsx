import Link from "next/link";
import { User } from "lucide-react";
import { BLOG_POSTS } from "@/content/blog-posts";

export default function BlogIndexPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <section className="border-border bg-muted/20 border-b">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
            Blog
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-xl">
            Engineering deep dives and thoughts on the future of meta-science.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        {BLOG_POSTS.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {BLOG_POSTS.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group bg-card border-border flex flex-col overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="from-primary/10 to-primary/5 aspect-video bg-gradient-to-br" />

                <div className="flex flex-1 flex-col p-6">
                  <div className="text-muted-foreground mb-3 flex items-center gap-3 text-xs">
                    <span className="text-primary font-medium">
                      {post.category}
                    </span>
                    <span>&bull;</span>
                    <span>{post.date}</span>
                  </div>

                  <h3 className="group-hover:text-primary mb-3 text-xl font-bold transition-colors">
                    {post.title}
                  </h3>

                  <p className="text-muted-foreground mb-4 line-clamp-3 flex-1 text-sm">
                    {post.excerpt}
                  </p>

                  <div className="border-border mt-auto flex items-center justify-between border-t pt-4">
                    <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                      <User className="h-3 w-3" />
                      {post.author}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {post.readTime}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-muted-foreground text-lg">
              No posts yet. Check back soon!
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
