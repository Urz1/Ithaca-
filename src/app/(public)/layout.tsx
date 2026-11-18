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
      {/* Floating Island Header */}
      <header className="fixed top-3.5 inset-x-0 z-50 w-full px-4 sm:px-6 pointer-events-none">
        <div className="mx-auto flex h-13 sm:h-14 max-w-4xl items-center justify-between rounded-full border border-border/80 bg-background/80 px-3.5 sm:px-5 shadow-lg shadow-black/[0.04] backdrop-blur-xl transition-all pointer-events-auto dark:border-white/[0.1] dark:bg-background/80 dark:shadow-black/40 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          {/* Logo & Brand */}
          <Link
            href="/"
            className="group flex items-center gap-2.5 pl-1 transition-opacity hover:opacity-90"
          >
            <img
              src="/logo.svg"
              alt="Ithaca"
              className="size-7 transition-transform duration-200 group-hover:scale-105"
            />
            <span className="text-base sm:text-lg font-bold tracking-tight text-foreground">
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
          </nav>

          {/* Actions & Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="hidden md:block">
              <NavAuthButtons />
            </div>
            <ThemeToggle />

            {/* Mobile Menu Trigger */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full md:hidden"
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
          <div className="mx-auto mt-2 max-w-4xl rounded-2xl border border-border/80 bg-background/95 p-5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-2 md:hidden pointer-events-auto dark:border-white/[0.1] dark:bg-[#0c0d12]/95">
            <nav className="flex flex-col space-y-2.5">
              <Link
                href="/about"
                className="hover:bg-muted/80 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="/docs"
                className="hover:bg-muted/80 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Docs
              </Link>
              <Link
                href="/blog"
                className="hover:bg-muted/80 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Blog
              </Link>

              {/* Mobile Auth Actions */}
              <div className="pt-3 border-t border-border/60 dark:border-white/10 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Link
                    href="/signin"
                    className="flex-1 text-center rounded-xl border border-border/80 dark:border-white/10 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="flex-1 text-center rounded-xl bg-foreground text-background py-2.5 text-xs font-semibold shadow-xs hover:bg-foreground/90 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Up Free
                  </Link>
                </div>
                <Link
                  href="/explore"
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 text-primary border border-primary/20 px-4 py-2.5 text-xs font-semibold hover:bg-primary/15 transition-colors"
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
        <div className="container mx-auto px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
            {/* Brand & Mission */}
            <div className="col-span-2 space-y-3.5">
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
              © {new Date().getFullYear()} Ithaca. Open-source research intelligence. Built for researchers worldwide.
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
