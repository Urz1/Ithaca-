export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-8 text-4xl font-bold">Privacy Policy</h1>
      <p className="text-muted-foreground mb-8">
        Last updated: January 12, 2026
      </p>

      <div className="prose prose-slate dark:prose-invert max-w-none">
        <p>
          At Ithaca, we take your privacy seriously. This policy describes how
          we collect, use, and protect your personal information.
        </p>

        <h3>1. Information We Collect</h3>
        <p>
          <strong>Account Information:</strong> When you sign up with Google or
          email and password, we store your name, email address, and profile
          picture. Passwords are stored using industry-standard hashing and are
          never stored in plain text.
        </p>
        <p>
          <strong>Usage Data:</strong> We collect anonymized telemetry on which
          papers you view and graphs you generate to improve our algorithms.
        </p>

        <h3>2. How We Use Information</h3>
        <ul>
          <li>To provide and maintain the Service</li>
          <li>To personalize citation recommendations</li>
          <li>To send you service updates (you can opt-out of marketing)</li>
        </ul>

        <h3>3. Data Retention</h3>
        <p>
          We retain your personalized graph data until you delete your account.
          Citation data itself is public knowledge and is maintained
          independently of user accounts.
        </p>

        <h3>4. Contact Us</h3>
        <p>
          If you have questions about this policy, please contact us at
          privacy@ithaca.app.
        </p>
      </div>
    </div>
  );
}
