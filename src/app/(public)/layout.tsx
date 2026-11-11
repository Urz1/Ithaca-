"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { NavAuthButtons } from "@/components/auth/nav-auth-buttons";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col selection:bg-primary/20 selection:text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md transition-all dark:border-white/[0.08] dark:bg-[#0c0d12]/85">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <img
              src="/logo.svg"
              alt="Ithaca"
              className="size-8 transition-transform duration-200 group-hover:scale-105"
            />
            <span className="text-xl font-extrabold tracking-tight text-foreground">
              Ithaca
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/about"
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground transition-all hover:bg-muted/70 hover:text-foreground"
            >
              About
            </Link>
            <Link
              href="/docs"
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground transition-all hover:bg-muted/70 hover:text-foreground"
            >
              Docs
            </Link>
            <Link
              href="/blog"
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground transition-all hover:bg-muted/70 hover:text-foreground"
            >
              Blog
            </Link>
            <Link
              href="/changelog"
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground transition-all hover:bg-muted/70 hover:text-foreground"
            >
              Changelog
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:block">
              <NavAuthButtons />
            </div>
            <ThemeToggle />

            {/* Mobile Menu Trigger */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Nav Overlay */}
        {mobileMenuOpen && (
          <div className="border-b border-border/80 bg-background/95 px-6 py-5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-2 md:hidden dark:border-white/[0.08] dark:bg-[#0c0d12]/95">
            <nav className="flex flex-col space-y-3">
              <Link
                href="/about"
                className="hover:bg-muted rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="/docs"
                className="hover:bg-muted rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Docs
              </Link>
              <Link
                href="/blog"
                className="hover:bg-muted rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Blog
              </Link>
              <Link
                href="/changelog"
                className="hover:bg-muted rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Changelog
              </Link>
              <div className="pt-3 border-t border-border/60">
                <Link
                  href="/explore"
                  className="flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>Launch Canvas</span>
                  <span>→</span>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border/80 bg-muted/20 transition-colors dark:border-white/[0.08] dark:bg-[#08090d]">
        <div className="container mx-auto px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-5 lg:gap-12">
            {/* Brand & Mission */}
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center gap-2.5">
                <img src="/logo.svg" alt="Ithaca" className="size-7" />
                <span className="text-lg font-extrabold tracking-tight text-foreground">
                  Ithaca
                </span>
              </div>
              <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                The dialectic knowledge engine for frontier research. Discover consensus,
                isolate contradictions, and map scientific discourse with zero-hallucination grounding.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <span className="relative flex h-2 w-2">
                  <span className="bg-emerald-500 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
                  <span className="bg-emerald-500 relative inline-flex h-2 w-2 rounded-full" />
                </span>
                <span className="text-xs font-semibold text-emerald-500 dark:text-emerald-400">
                  All Systems Operational
                </span>
              </div>
            </div>

            {/* Product */}
            <div>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-foreground">
                Product
              </h3>
              <ul className="text-muted-foreground space-y-3 text-sm">
                <li>
                  <Link
                    href="/explore"
                    className="hover:text-foreground transition-colors"
                  >
                    Interactive Canvas
                  </Link>
                </li>
                <li>
                  <Link
                    href="/changelog"
                    className="hover:text-foreground transition-colors"
                  >
                    Changelog
                  </Link>
                </li>
                <li>
                  <Link
                    href="/status"
                    className="hover:text-foreground transition-colors"
                  >
                    System Status
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-foreground">
                Resources
              </h3>
              <ul className="text-muted-foreground space-y-3 text-sm">
                <li>
                  <Link
                    href="/docs"
                    className="hover:text-foreground transition-colors"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="hover:text-foreground transition-colors"
                  >
                    Research Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="hover:text-foreground transition-colors"
                  >
                    Scientific Methodology
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal & Compliance */}
            <div>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-foreground">
                Trust & Security
              </h3>
              <ul className="text-muted-foreground space-y-3 text-sm">
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-foreground transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="hover:text-foreground transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/80 px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground dark:border-white/[0.08]">
                    SOC 2 Type II
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-border/60 text-muted-foreground mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-xs sm:flex-row dark:border-white/[0.06]">
            <p>
              © {new Date().getFullYear()} Ithaca • Engineered by{" "}
              <Link
                href="/about"
                className="hover:text-foreground font-semibold underline underline-offset-4"
              >
                Rhizan Tech
              </Link>
              . Built for researchers worldwide.
            </p>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-muted-foreground/80">
                CC-BY 4.0 Open Science
              </span>
              <span>•</span>
              <span className="font-mono text-[11px] text-muted-foreground/80">
                ArXiv Data Partner
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
