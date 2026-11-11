export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-8 text-4xl font-bold">Terms of Service</h1>
      <p className="text-muted-foreground mb-8">
        Last updated: January 12, 2026
      </p>

      <div className="prose prose-slate dark:prose-invert max-w-none">
        <h3>1. Acceptance of Terms</h3>
        <p>
          By accessing or using Ithaca ("the Service"), you agree to be bound by
          these Terms. If you disagree with any part of the terms, you may not
          access the Service.
        </p>

        <h3>2. Use License</h3>
        <p>
          Permission is granted to temporarily download one copy of the
          materials (information or software) on Ithaca's website for personal,
          non-commercial transitory viewing only.
        </p>

        <h3>3. Disclaimer</h3>
        <p>
          The citation data provided is for informational purposes only. Ithaca
          does not guarantee the accuracy of automated sentiment analysis
          (Support/Refute classifications).
        </p>

        <h3>4. User Accounts</h3>
        <p>
          You are responsible for safeguarding the credentials used to access
          the Service. You agree not to disclose your password to any third
          party.
        </p>

        <h3>5. Governing Law</h3>
        <p>
          These terms shall be governed and construed in accordance with the
          laws of California, United States, without regard to its conflict of
          law provisions.
        </p>
      </div>
    </div>
  );
}
