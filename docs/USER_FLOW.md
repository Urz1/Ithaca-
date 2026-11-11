# User Flow Documentation - Ithaca UI

Complete guide to the user journey from landing page through registration, sign-in, onboarding, app usage, and logout.

## Table of Contents

1. [Quick Start - Visual Overview](#quick-start)
2. [1. Registration / Sign-Up Flow](#1-registration--sign-up-flow)
3. [2. Sign-In / Login Flow](#2-sign-in--login-flow)
4. [3. Session Management](#3-session-management)
5. [4. Onboarding](#4-onboarding)
6. [5. App Usage / Dashboard](#5-app-usage--dashboard)
7. [6. Logout Flow](#6-logout-flow)
8. [7. Route Protection](#7-route-protection)
9. [Architecture Reference](#architecture-reference)
10. [Environment Setup](#environment-setup)
11. [Developer Guide](#developer-guide)

---

## Quick Start

### Complete User Journey Flowchart

```
LANDING PAGE
    │
    ├─→ New User ──→ SIGN UP ──→ OAuth (Google/ORCID) or Email+Password
    │                     │
    │                     └─→ Set Password (if Email)
    │                          (Strength validation)
    │
    └─→ Existing User ──→ SIGN IN ──→ OAuth or Email+Password
                              │
                              └─→ Forgot Password? ──→ Email Reset Link

POST-LOGIN
    │
    ├─→ SESSION CREATED ──→ httpOnly Cookie + DB Record
    │
    ├─→ NEW USER? ──→ ONBOARDING ──→ "How to read the graph" tutorial
    │
    └─→ REDIRECT TO /explore ──→ MAIN APP
                      │
                      ├─→ /explore - Canvas visualization
                      ├─→ /dashboard - Profile & statistics
                      ├─→ /projects - Project management
                      ├─→ /query - Query interface
                      └─→ /search - Search functionality

USER MENU (Avatar Click)
    │
    ├─→ Dashboard
    ├─→ Settings
    ├─→ My Graphs
    ├─→ History
    └─→ LOGOUT ──→ Session destroyed, redirect to /

```

---

## 1. Registration / Sign-Up Flow

### Overview

Users can register via OAuth (Google, ORCID) or traditional email + password.

### File Reference

- **Page:** `src/app/(public)/signup/page.tsx` (339 lines)
- **Auth Library:** `src/lib/auth-client.ts` (uses Better Auth v5)
- **ORCID Config:** `src/lib/auth-orcid.ts` (68 lines)

### Sign-Up Methods

#### Method A: OAuth (Google)

```
1. Click "Sign in with Google" button
2. Redirected to Google OAuth consent screen
3. User authorizes Ithaca app
4. Google returns user profile (email, name, avatar)
5. User automatically created in database
6. Session created with httpOnly cookie
7. Redirected to /explore (main app)
```

**Flow in Code:**

```typescript
// src/app/(public)/signup/page.tsx
await authClient.signIn.social({
  provider: "google",
  callbackURL: "/explore",
});
```

#### Method B: ORCID OAuth

```
1. Click "Sign in with ORCID" button (marked as "Recommended")
2. Redirected to ORCID OAuth consent screen
3. User grants Ithaca permission to access ORCID profile
4. ORCID returns user data:
   - ORCID ID (unique identifier)
   - Name
   - Email (if public)
5. User record created with orcidId field
6. Session created
7. Redirected to /explore
```

**ORCID OAuth Endpoints:**

- Authorization: `https://orcid.org/oauth/authorize`
- Token Exchange: `https://orcid.org/oauth/token`
- User Info: `https://pub.orcid.org/v3.0/{orcid}/person`

#### Method C: Email & Password Registration

```
STEP 1: Basic Info
├─ Enter Name (optional)
├─ Enter Email (validated)
└─ Continue

STEP 2: Password Setup
├─ Enter Password
│  ├─ Password Strength Meter (5-level)
│  │  ├─ Weak (< 8 chars)
│  │  ├─ Fair (8+ chars)
│  │  ├─ Good (uppercase + numbers)
│  │  ├─ Strong (+ special chars)
│  │  └─ Very Strong (12+ chars)
│  │
│  ├─ Requirements:
│  │  ├─ Minimum 8 characters
│  │  ├─ Uppercase letter (optional but recommended)
│  │  ├─ Number (optional but recommended)
│  │  └─ Special character (optional but recommended)
│  │
│  └─ Password visibility toggle
│
├─ Confirm Password (must match)
└─ Sign Up button (enabled when valid)

STEP 3: Account Created
├─ User record created in database
├─ Email verification sent (TODO)
├─ Session created
└─ Redirect to /explore
```

**Sign-Up Form State:**

```typescript
// From src/app/(public)/signup/page.tsx
{
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  passwordStrength: {
    level: "weak" | "fair" | "good" | "strong" | "veryStrong";
    score: number;
  }
  isLoading: boolean;
  error: string | null;
  success: boolean;
}
```

### Database Changes After Sign-Up

**User Table:**

```sql
INSERT INTO "User" (
  id, name, email, emailVerified,
  image, hasCompletedOnboarding, createdAt, updatedAt
) VALUES (
  'user_abc123', 'John Doe', 'john@example.com', false,
  NULL, false, NOW(), NOW()
);
```

**Session Table (if OAuth):**

```sql
INSERT INTO "Account" (
  id, userId, accountId, providerId,
  accessToken, refreshToken, createdAt
) VALUES (
  'account_123', 'user_abc123', 'google_abc',
  'google', 'access_token_xyz', NULL, NOW()
);
```

---

## 2. Sign-In / Login Flow

### File Reference

- **Page:** `src/app/(public)/signin/page.tsx` (247 lines)
- **Dialog Component:** `src/components/auth/sign-in-dialog.tsx` (165 lines)
- **Auth Client:** `src/lib/auth-client.ts`

### Sign-In Methods

#### Method A: OAuth Sign-In (Quick)

```
UI: Two buttons side-by-side
├─ "Sign in with ORCID" (Recommended badge)
└─ "Sign in with Google"

Flow:
1. User clicks OAuth button
2. Loading state shown (spinner icon)
3. Redirected to provider's OAuth page
4. User authenticates with provider
5. Provider returns to /explore (callback URL)
6. Existing session validated
7. User logged in
```

#### Method B: Email & Password Sign-In

```
STEP 1: Email Entry
├─ Email input field
├─ Email validation (basic regex)
└─ Continue button (enabled when valid email)

STEP 2: Password Entry
├─ Password input field
├─ Show/Hide toggle (eye icon)
├─ "Forgot password?" link
└─ Sign In button (enabled when password entered)

STEP 3: Session Created
├─ Email + password verified against database
├─ Session token generated
├─ httpOnly cookie set
├─ Session record created in DB
└─ Redirect to /explore

Error Handling:
├─ Email not found: "Email not registered"
├─ Wrong password: "Invalid password"
├─ Account locked: (TODO - after N failed attempts)
└─ Server error: User-friendly error message
```

**Sign-In Form State:**

```typescript
{
  email: string;
  password: string;
  rememberMe: boolean;
  isLoading: boolean;
  error: string | null;
  showPassword: boolean;
}
```

#### Method C: Magic Link (Passwordless) - PLANNED

```
Email entered → Magic link sent → User clicks link → Logged in
Status: Partially implemented in sign-in-dialog.tsx (commented)
```

### Sign-In UI States

**Initial State:**

```
┌─────────────────────────────────────┐
│ Quick Sign In (OAuth)               │
│ [Sign in with ORCID] [Google]       │
├─────────────────────────────────────┤
│ Or use Email & Password             │
├─────────────────────────────────────┤
│ Email: [_____________]              │
│ [Continue]                          │
└─────────────────────────────────────┘
```

**After Email Entered:**

```
┌─────────────────────────────────────┐
│ Back button                         │
├─────────────────────────────────────┤
│ Enter your password                 │
│ Email: john@example.com             │
│                                     │
│ Password: [___________] [eye icon]  │
│ Forgot password?                    │
│                                     │
│ [Sign In]                           │
└─────────────────────────────────────┘
```

---

## 3. Session Management

### File Reference

- **Config:** `src/lib/auth.ts` (78 lines)
- **Middleware:** `src/middleware.ts` (121 lines)
- **Database:** `prisma/schema.prisma` (User, Session, Account models)

### Session Configuration

**Session Duration Settings:**

```typescript
// From src/lib/auth.ts
session: {
  expiresIn: 7 * 24 * 60 * 60,      // 7 days
  updateAgeIn: 24 * 60 * 60,         // Update after 24 hours
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60,                  // Cache for 5 minutes
  }
}
```

**Cookie Configuration:**

```typescript
cookie: {
  secure: NODE_ENV === "production",  // HTTPS only in prod
  httpOnly: true,                     // Cannot be accessed via JS
  sameSite: "lax",                    // CSRF protection
  path: "/",
  name: "ithaca.session",             // Cookie name with prefix
}
```

### Session Storage

**Stored in PostgreSQL:**

```sql
-- Session table structure
CREATE TABLE "Session" (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES "User"(id),
  token TEXT NOT NULL UNIQUE,
  expiresAt TIMESTAMP NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  createdAt TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP NOT NULL
);
```

**Session Lifecycle:**

```
┌─────────────────────────────────────────────────────┐
│ 1. USER LOGS IN                                     │
│    └─→ OAuth or Email+Password verified            │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 2. SESSION TOKEN CREATED                            │
│    └─→ Random token generated by Better Auth       │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 3. SESSION STORED                                   │
│    └─→ Session record inserted in DB with:         │
│        - Token (unique)                            │
│        - expiresAt (7 days from now)               │
│        - IP address, user agent                    │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 4. COOKIE SET                                       │
│    └─→ httpOnly cookie sent to browser with:       │
│        - Token value                               │
│        - Secure (HTTPS only in prod)               │
│        - SameSite=Lax (CSRF protection)            │
│        - Expires in 7 days                         │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 5. CLIENT-SIDE CACHING (5 minutes)                  │
│    └─→ Session cached in browser memory:           │
│        - Reduces database queries                  │
│        - Revalidates after 5 minutes               │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 6. ROUTE ACCESS                                     │
│    ├─→ Protected routes check session              │
│    ├─→ Middleware verifies token                   │
│    └─→ User can access app features                │
└─────────────────────────────────────────────────────┘
```

### Accessing Session in Components

**Client-Side (React Components):**

```typescript
import { useSession } from "@/lib/auth-client";

export function UserProfile() {
  const { data: session, isPending } = useSession();

  if (isPending) return <div>Loading...</div>;
  if (!session) return <div>Not logged in</div>;

  return (
    <div>
      Welcome, {session.user.name}!
      Email: {session.user.email}
      ORCID: {session.user.orcidId}
    </div>
  );
}
```

**Server-Side:**

```typescript
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json({ user: session.user });
}
```

### Session User Data Structure

```typescript
type Session = {
  user: {
    id: string; // CUID unique ID
    name: string | null; // Display name
    email: string; // Email address
    emailVerified: boolean; // Email verified?
    image: string | null; // Avatar URL
    orcidId: string | null; // ORCID ID (if logged in via ORCID)
    hasCompletedOnboarding: boolean; // Tutorial completed?
    createdAt: Date; // Account creation time
    updatedAt: Date; // Last updated
  };
  expiresAt: Date; // Session expiration time
};
```

---

## 4. Onboarding

### File Reference

- **Component:** `src/components/auth/onboarding-dialog.tsx` (124 lines)
- **Database Flag:** `User.hasCompletedOnboarding`

### When Onboarding is Triggered

```
Trigger Conditions:
├─→ New user (hasCompletedOnboarding = false)
├─→ After sign-up completed
├─→ After session created
└─→ On first visit to /explore

Display: Modal dialog that blocks interaction until dismissed
```

### Onboarding Content

**Title & Purpose:**

- Title: "How to read the graph"
- Badge: "New User Guide"
- Icon: Network/graph icon
- Description: "Learn how to interpret the citation network visualization"

**Section 1: Nodes (Papers)**

```
Visual: Example graph with nodes of different sizes and colors

Content:
├─ Node Size = Citation Count
│  ├─ Larger nodes = More citations
│  ├─ Smaller nodes = Fewer citations
│  └─ Example shown visually
│
├─ Node Color = Publication Year
│  ├─ Color gradient from old (color A) to new (color B)
│  └─ Helps identify recent vs. foundational papers
│
└─ Click node to view details
```

**Section 2: Edges (Connections)**

```
Visual: Example connections between nodes

Content:
├─ Edge Type 1: Support Connection
│  ├─ Color: Green
│  ├─ Meaning: Source paper supports/cites target paper
│  └─ Direction: Arrow pointing to cited paper
│
├─ Edge Type 2: Refutation Connection
│  ├─ Color: Red
│  ├─ Icon: X symbol
│  ├─ Meaning: Source paper disagrees/refutes target paper
│  └─ Direction: Arrow pointing to refuted paper
│
└─ Hover edges to see source and destination
```

**Section 3: Interactions**

```
Content:
├─ Zoom with mouse wheel
├─ Pan by dragging
├─ Click nodes for details
├─ Search for specific papers
└─ Use filters and controls
```

### Dismissing Onboarding

**Methods:**

1. **"Get Started" Button:**
   - Sets `hasCompletedOnboarding: true`
   - Closes dialog
   - User proceeds to explore

2. **Close Button (X):**
   - Same action as "Get Started"
   - Completes onboarding

3. **Click Outside (if enabled):**
   - May close without setting flag (depends on implementation)

**Post-Onboarding:**

```
User clicks "Get Started"
        ↓
Dialog closes
        ↓
hasCompletedOnboarding flag set to true
        ↓
User can interact with /explore canvas
        ↓
Onboarding won't show again for this user
```

---

## 5. App Usage / Dashboard

### File Reference

- **Main Dashboard:** `src/app/(app)/dashboard/page.tsx` (425 lines)
- **Canvas/Explore:** `src/app/(app)/explore/page.tsx`
- **Canvas Layout:** `src/components/layout/canvas-layout.tsx` (100+ lines)
- **Dashboard API:** `src/lib/api/dashboard-api.ts` (201 lines)

### Application Routes (Protected)

```
After login, user can access:

/explore
├─ Main graph visualization canvas
├─ Interactive citation network
├─ Search and filter controls
├─ Zoom, pan, click interactions
└─ View paper details in side panel

/dashboard
├─ User profile & statistics
├─ Saved graphs overview
├─ Collections overview
├─ Correction history
└─ Recent activity

/projects
├─ Project list
├─ Create new project
├─ Project details
└─ Project collaboration

/search
├─ Search papers
├─ Filter results
├─ Add to projects/collections
└─ View paper details

/settings
├─ Profile information
├─ Account settings
├─ Preferences
└─ Privacy controls
```

### Dashboard Layout

**Header Section:**

```
┌──────────────────────────────────────────────────────┐
│ Profile Avatar          │ Name: John Doe             │
│ [small image]           │ Dept: Computer Science     │
│                         │ Institution: MIT            │
│                         │ Badge: Active Researcher   │
│                         │ Member since: Jan 2024     │
│                         │ [Edit Profile Button]      │
└──────────────────────────────────────────────────────┘
```

**Statistics Cards:**

```
┌───────────────────┬───────────────────┬───────────────────┐
│ Saved Graphs      │ Collections       │ Edges Corrected   │
│                   │                   │                   │
│ 12                │ 5                 │ 47                │
│ ↑ +3 this month   │ ↑ +1 this month   │ ↑ +12 this month  │
└───────────────────┴───────────────────┴───────────────────┘
```

**Tabbed Navigation:**

```
[Overview] [My Graphs] [Collections] [History] [Settings]

Overview Tab (Default):
├─ Recent Activity Section
│  ├─ Grid of recent graphs/collections
│  ├─ Cards show: title, update time, tags, node count
│  ├─ Color-coded cards
│  └─ "View all" link
│
└─ Latest Corrections Table
   ├─ Columns: Source Node, Target Node, Type, Status, Date
   ├─ Status badges: approved (green), rejected (red), pending (yellow)
   └─ Click row to view details

My Graphs Tab:
├─ Grid view of all saved graphs
├─ Sorting: Recent, Popular, Alphabetical
└─ "Create new graph" button

Collections Tab:
├─ Grid of user collections
├─ Shows paper count per collection
├─ Sorting and filtering
└─ "Create new collection" button

History Tab:
├─ Complete correction history table
├─ Filters by type, status, date
├─ Export history option
└─ Pagination controls

Settings Tab:
├─ Profile settings
├─ Account security
├─ Preferences
└─ Privacy controls
```

### User Interactions in App

**1. Viewing the Canvas (/explore)**

```
User Action: Click /explore or "Explore" button
        ↓
Canvas loads with graph visualization
├─ Show all papers/nodes
├─ Show all citations/edges
├─ Apply user's saved filters
└─ Enable interactions

Interactions:
├─ Click node → Show paper details
├─ Click edge → Show citation relationship
├─ Search paper name → Filter and highlight
├─ Zoom with mouse wheel → Adjust view
├─ Drag canvas → Pan view
├─ Use sidebar controls:
│  ├─ Force Atlas layout
│  ├─ Node size controls
│  ├─ Filter by year
│  ├─ Search
│  └─ Export
└─ Save as collection/graph
```

**2. Creating a Project**

```
User Action: Click "New Project"
        ↓
Popup/Dialog appears:
├─ Project name input
├─ Description input
├─ Visibility (Private/Public)
└─ Create button

Project created:
├─ Added to user's projects
├─ Canvas initialized
└─ User can add papers/queries
```

**3. Searching for Papers**

```
User Action: Go to /search or use search in /explore
        ↓
Enter search query:
├─ Title search
├─ Author search
├─ DOI search
└─ Abstract keywords

Results show:
├─ Paper cards with metadata
├─ Relevance score
├─ Citation count
├─ Year published

User can:
├─ Click paper → View full details
├─ Add to project → Select project
├─ Add to collection → Select or create
└─ Save for later
```

**4. Correcting Citations**

```
User Action: Identify citation error in graph
        ↓
Click correction button:
├─ Select source paper
├─ Select target paper
├─ Select relationship type:
│  ├─ Support
│  ├─ Refute
│  ├─ Neutral/Unrelated
│  └─ Duplicate
└─ Add comment/reason

Correction submitted:
├─ Added to queue for review
├─ Status: Pending
├─ Community votes on correction
└─ If approved, graph updates
```

---

## 6. Logout Flow

### File Reference

- **User Button:** `src/components/auth/user-button.tsx` (85 lines)
- **User Menu:** `src/components/auth/user-menu.tsx` (201 lines)
- **Auth Client:** `src/lib/auth-client.ts`

### Logout Process

**Step 1: Access User Menu**

```
User clicks avatar button (top right corner)
        ↓
User menu dropdown appears:
├─ Avatar and name display
├─ Dashboard link
├─ My Graphs link
├─ History link
├─ Settings link
├─ Theme toggle
└─ LOGOUT button (red/destructive styling)
```

**Step 2: Click Logout**

```
User clicks "LOGOUT" button
        ↓
Loading state activated:
├─ Button shows spinner/loading indicator
├─ Menu stays visible
└─ Button disabled during logout
```

**Step 3: Session Termination**

```
authClient.signOut() called:

Backend:
├─ Delete session token from database
├─ Invalidate any active sessions
├─ Clear session cookies
└─ Remove user authentication state

Frontend:
├─ Clear session cache
├─ Clear user state from context
├─ Remove authentication headers
└─ Clear local storage (if any auth data)
```

**Step 4: Redirect to Home**

```
Logout completes
        ↓
User redirected to "/" (landing page)
        ↓
Session cookie removed
        ↓
All protected routes now redirect to /signin
```

### Logout Code Implementation

```typescript
// From src/components/auth/user-menu.tsx
const handleSignOut = async () => {
  setIsLoading(true);
  try {
    await authClient.signOut();
    router.push("/"); // Redirect to home
  } catch (error) {
    console.error("Sign out error:", error);
    // Show error toast to user
  } finally {
    setIsLoading(false);
  }
};
```

### Session Cleanup

**Database Operations:**

```sql
-- Session deleted
DELETE FROM "Session"
WHERE userId = 'user_abc123';

-- Any temporary data cleaned
DELETE FROM "temporary_session_data"
WHERE userId = 'user_abc123';
```

**Cookie Cleared:**

```
HTTP Response Header:
Set-Cookie: ithaca.session=; Path=/;
            HttpOnly; Secure; SameSite=Lax;
            Expires=Thu, 01 Jan 1970 00:00:00 GMT
```

---

## 7. Route Protection

### File Reference

- **Middleware:** `src/middleware.ts` (121 lines)
- **Environment:** `src/lib/env.ts`

### Public Routes (No Authentication Required)

```typescript
const publicRoutes = [
  "/", // Landing page
  "/about", // About page
  "/blog", // Blog
  "/docs", // Documentation
  "/api", // API docs
  "/privacy", // Privacy policy
  "/terms", // Terms of service
  "/changelog", // Changelog
  "/roadmap", // Roadmap
  "/status", // Status page
];
```

These routes are accessible to anyone, authenticated or not.

### Auth Routes (Redirect if Authenticated)

```typescript
const authRoutes = [
  "/signin",             // Sign in page
  "/signup",             // Sign up page
  "/reset-password",     // Password reset
];

If user is already authenticated:
├─ Redirect to /explore (main app)
└─ Prevent accessing auth pages while logged in
```

### Protected Routes (Require Authentication)

```typescript
const protectedRoutes = [
  "/explore",            // Main canvas
  "/dashboard",          // User dashboard
  "/projects",           // Projects list
  "/query",              // Query interface
  "/search",             // Search (with login recommended)
];

If user is NOT authenticated:
├─ Redirect to /signin?callbackUrl={original_page}
└─ After login, user is redirected back to original page
```

### Middleware Security Checks

**Request Flow:**

```
1. Request arrives at middleware
        ↓
2. Check if route is public
   ├─ Yes → Allow access
   └─ No → Continue to step 3

3. Check authentication status
   ├─ Get session from cookie
   ├─ Validate token
   └─ Verify in database

4. Route type check
   ├─ Auth route + authenticated
   │  └─ Redirect to /explore
   ├─ Protected route + not authenticated
   │  └─ Redirect to /signin?callbackUrl=
   └─ Otherwise → Allow access

5. Add security headers
   ├─ X-Frame-Options: DENY (prevent clickjacking)
   ├─ X-Content-Type-Options: nosniff (prevent MIME sniffing)
   ├─ Referrer-Policy: strict-origin-when-cross-origin
   ├─ Permissions-Policy: camera=(), microphone=()
   └─ Content-Security-Policy (in production)

6. Set user in request context
   ├─ Attach session to headers
   └─ Available in server components
```

### Rate Limiting

```
Configuration:
├─ 10 requests per 60 seconds
├─ Per IP address
└─ In-memory storage (Redis recommended for production)

If exceeded:
├─ Return 429 Too Many Requests
├─ Include Retry-After header
└─ User must wait before retrying
```

### CSRF Protection

```
Cookie-based CSRF tokens:
├─ Token name: ithaca.csrf-token
├─ Generated on first request
├─ Validated on mutations (POST, PUT, DELETE)
├─ Invalid token → 403 Forbidden
└─ Regenerated after sensitive operations
```

---

## Architecture Reference

### Technology Stack

```
Frontend:
├─ Next.js 16 (App Router)
├─ React 19
├─ TailwindCSS
├─ TypeScript
└─ Zod (validation)

Backend:
├─ Next.js API Routes
├─ Better Auth v5 (authentication)
├─ Prisma ORM
└─ PostgreSQL

Authentication:
├─ OAuth 2.0 (Google, ORCID)
├─ Email + Password
├─ Session-based (httpOnly cookies)
└─ CSRF protection

Database:
├─ PostgreSQL
├─ Prisma schema
├─ Tables: User, Session, Account, Verification
└─ Neon or similar managed PostgreSQL
```

### Authentication Flow Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    USER INITIATES LOGIN                  │
└──────────────────────────────────────────────────────────┘
                          │
                          ├─→ OAuth Flow
                          │   ├─ Redirect to provider
                          │   ├─ Provider auth
                          │   ├─ Callback to app
                          │   └─ Exchange code for token
                          │
                          └─→ Email+Password Flow
                              ├─ Email entered
                              ├─ Password entered
                              └─ Verify against database

                          ↓
┌──────────────────────────────────────────────────────────┐
│              BETTER AUTH PROCESSES REQUEST               │
│ ├─ Verify credentials                                    │
│ ├─ Check account exists or create new                    │
│ └─ Validate email/OAuth provider                         │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│               SESSION CREATED & STORED                   │
│ ├─ Generate random token                                 │
│ ├─ Insert into Session table with:                       │
│ │  ├─ userId                                             │
│ │  ├─ token                                              │
│ │  ├─ expiresAt (7 days)                                 │
│ │  ├─ ipAddress                                          │
│ │  └─ userAgent                                          │
│ └─ Commit to database                                    │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│                 COOKIE SENT TO BROWSER                   │
│ Set-Cookie: ithaca.session={token}                       │
│             HttpOnly; Secure; SameSite=Lax;              │
│             Path=/; Max-Age=604800                       │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│             REDIRECT TO APP (/explore)                   │
│ Browser sends cookie with every request                  │
│ App validates session on each request                    │
└──────────────────────────────────────────────────────────┘
```

### Database Schema

```
User {
  id: String @id @default(cuid())
  name: String?
  email: String @unique
  emailVerified: Boolean @default(false)
  image: String?
  orcidId: String? @unique
  hasCompletedOnboarding: Boolean @default(false)
  sessions: Session[]
  accounts: Account[]
  verifications: Verification[]
  createdAt: DateTime @default(now())
  updatedAt: DateTime @updatedAt
}

Session {
  id: String @id @default(cuid())
  userId: String
  token: String @unique
  expiresAt: DateTime
  ipAddress: String?
  userAgent: String?
  user: User @relation(fields: [userId], references: [id])
  createdAt: DateTime @default(now())
  updatedAt: DateTime @updatedAt
}

Account {
  id: String @id @default(cuid())
  userId: String
  accountId: String
  providerId: String
  accessToken: String?
  refreshToken: String?
  idToken: String?
  accessTokenExpiresAt: DateTime?
  refreshTokenExpiresAt: DateTime?
  scope: String?
  password: String?
  user: User @relation(fields: [userId], references: [id])
  createdAt: DateTime @default(now())
  updatedAt: DateTime @updatedAt
}

Verification {
  id: String @id @default(cuid())
  identifier: String
  value: String
  expiresAt: DateTime
  createdAt: DateTime @default(now())
  updatedAt: DateTime @updatedAt
}
```

---

## Environment Setup

### Required Environment Variables

**Create `.env.local` file:**

```bash
# Database Connection
DATABASE_URL=postgresql://user:password@host:5432/ithaca_db

# Better Auth Configuration
BETTER_AUTH_SECRET=your-secret-key-min-32-chars-randomly-generated
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ORCID OAuth
ORCID_CLIENT_ID=your-orcid-client-id
ORCID_CLIENT_SECRET=your-orcid-client-secret

# Email Configuration (for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@ithaca.app

# Environment
NODE_ENV=development
```

### Generate Better Auth Secret

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String([System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes(32))

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### OAuth Provider Setup

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Set redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Secret

#### ORCID OAuth

1. Register at [ORCID Developer Tools](https://orcid.org/developer-tools)
2. Create new public client
3. Set redirect URI: `http://localhost:3000/api/auth/callback/orcid`
4. Copy Client ID and Secret
5. Create `src/lib/auth-orcid.ts` with provider config

---

## Developer Guide

### Adding New Features

#### 1. Check User Authentication Status

```typescript
import { useSession } from "@/lib/auth-client";

export function MyComponent() {
  const { data: session, isPending, error } = useSession();

  if (isPending) return <Skeleton />;
  if (!session) return <NeedLoginMessage />;

  return <LoggedInContent user={session.user} />;
}
```

#### 2. Protect Server-Side Routes

```typescript
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use session.user in your logic
  return Response.json({ data: session.user });
}
```

#### 3. Add Protected UI Component

```typescript
"use client";

import { useSession } from "@/lib/auth-client";
import { redirect } from "next/navigation";

export function ProtectedComponent() {
  const { data: session } = useSession();

  if (!session) {
    return redirect("/signin");
  }

  return <YourComponent user={session.user} />;
}
```

#### 4. Modify User Data

```typescript
// In your API route handler
const updatedUser = await db.user.update({
  where: { id: session.user.id },
  data: {
    name: "New Name",
    hasCompletedOnboarding: true,
  },
});
```

#### 5. Add New OAuth Provider

```typescript
// In src/lib/auth.ts
import { orcidAuthProvider } from "./auth-orcid";

export const auth = initializeAuth({
  plugins: [
    // ...existing plugins
    orcidAuthProvider,
  ],
});
```

### Common Tasks

#### Redirect After Login

```typescript
// Automatic: Use callbackURL parameter
await authClient.signIn.social({
  provider: "google",
  callbackURL: "/dashboard", // Redirect here after login
});

// Manual: After successful auth
if (authResponse.success) {
  router.push("/dashboard");
}
```

#### Store Additional User Data

```typescript
// Add field to User model in prisma/schema.prisma
model User {
  // ... existing fields
  department: String?
  institution: String?
}

// Then use in your code
const user = await db.user.update({
  where: { id: userId },
  data: {
    department: "Computer Science",
    institution: "MIT"
  }
});
```

#### Create Permission System

```typescript
// Add to User model
model User {
  // ... existing fields
  role: Role @default(USER)  // USER, ADMIN, MODERATOR
}

enum Role {
  USER
  ADMIN
  MODERATOR
}

// Middleware check
if (session.user.role !== "ADMIN") {
  return new Response("Forbidden", { status: 403 });
}
```

#### Implement Email Verification

```typescript
// Currently: emailVerified is stored but not enforced
// To enforce: Check in middleware
const session = await auth.api.getSession({ headers: request.headers });
if (session && !session.user.emailVerified) {
  return redirect("/verify-email");
}
```

### Debugging

#### Session Not Persisting

```typescript
// Check 1: Session cookie being set
// DevTools → Application → Cookies → Check for "ithaca.session"

// Check 2: Verify session in database
SELECT * FROM "Session" WHERE "userId" = 'user_id';

// Check 3: Check middleware logs
console.log("Session:", session);
console.log("Headers:", request.headers);
```

#### OAuth Callback Failing

```typescript
// Check 1: Redirect URI matches
// Google/ORCID → OAuth settings → Verify callbackURL matches

// Check 2: Credentials correct
// .env → Check CLIENT_ID and SECRET

// Check 3: Check logs
// npm run dev → Look for OAuth errors in console
```

#### User Cannot Access Protected Routes

```typescript
// Check 1: Middleware allows route
// src/middleware.ts → Verify route in protectedRoutes array

// Check 2: Session valid
// useSession() → Check if data exists

// Check 3: Cookie secure in production
// src/lib/auth.ts → Check cookie.secure setting
```

---

## Quick Reference

### Key Commands

```bash
# Start development server
npm run dev

# Open browser
http://localhost:3000

# Run migrations
npx prisma migrate dev

# View database
npx prisma studio

# Check types
npm run type-check

# Build for production
npm run build
```

### File Quick Links

| Purpose       | File                                        |
| ------------- | ------------------------------------------- |
| Signup page   | `src/app/(public)/signup/page.tsx`          |
| Signin page   | `src/app/(public)/signin/page.tsx`          |
| Dashboard     | `src/app/(app)/dashboard/page.tsx`          |
| Auth config   | `src/lib/auth.ts`                           |
| Middleware    | `src/middleware.ts`                         |
| Prisma schema | `prisma/schema.prisma`                      |
| Onboarding    | `src/components/auth/onboarding-dialog.tsx` |
| User menu     | `src/components/auth/user-menu.tsx`         |

### Helpful Links

- [Better Auth Docs](https://better-auth.com)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Prisma Docs](https://www.prisma.io/docs)
- [OAuth 2.0 Standard](https://oauth.net/2/)
