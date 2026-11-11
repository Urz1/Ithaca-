# User Authentication State Diagrams

Comprehensive visual representations of the user authentication and usage flow in Ithaca UI.

## 1. Complete User Journey Flowchart

```
                            ┌─────────────────────┐
                            │  ITHACA LANDING     │
                            │   PAGE (/)          │
                            └──────────┬──────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
            ┌─────────────┐    ┌──────────────┐   ┌─────────────┐
            │ "Sign Up"   │    │  "Sign In"   │   │  "Try Demo" │
            │   Button    │    │   Button     │   │   Button    │
            └──────┬──────┘    └───────┬──────┘   └──────┬──────┘
                   │                   │                 │
                   ▼                   ▼                 ▼
            ┌─────────────┐    ┌──────────────┐   ┌─────────────┐
            │ /signup     │    │ /signin      │   │ /explore    │
            │  PAGE       │    │  PAGE        │   │ (Guest View)│
            └──────┬──────┘    └───────┬──────┘   └─────────────┘
                   │                   │
      ┌────────────┼────────────┐      │
      │                         │      │
      ▼                         ▼      ▼
  ┌────────┐              ┌────────┐  ┌────────┐
  │ OAuth  │              │ OAuth  │  │Email + │
  │Choice  │              │Choice  │  │Passwd  │
  └──┬──┬──┘              └──┬──┬──┘  └───┬────┘
     │ │                    │ │          │
  ┌──▼ ▼──┐             ┌───▼ ▼────┐    │
  │Google ├─┐          │ORCID│Google├┐  │
  │ORCID  │ │  Verify  │Credentials│◄───┘
  └───────┘ │  + Save  └──┬─┬──────┘
            │              │ │
            └──────────────┤ │
                           │ │
                    ┌──────▼─▼──────┐
                    │  SIGN UP FORM │
                    │ (if Email+PW) │
                    │  Name, Email  │
                    │  Password     │
                    │  (Strength)   │
                    └────────┬──────┘
                             │
                      ┌──────▼──────┐
                      │  VALIDATE   │
                      │  & CREATE   │
                      │  USER ACCT  │
                      └────────┬────┘
                               │
                    ┌──────────▼──────────┐
                    │  SESSION CREATED    │
                    │  - Token generated  │
                    │  - Cookie set       │
                    │  - DB session saved │
                    └────────┬────────────┘
                             │
                  ┌──────────▼──────────┐
                  │ NEW USER?           │
                  └────────┬────────────┘
                       Yes │ No
                   ┌───────┼────────┐
                   ▼               ▼
            ┌──────────────┐  ┌────────────┐
            │ONBOARDING   │  │ SKIP       │
            │ DIALOG      │  │ONBOARDING  │
            │ "How to     │  └──────┬─────┘
            │  read the   │         │
            │  graph"     │         │
            │ - Nodes     │         │
            │ - Edges     │    ┌────▼─────────┐
            │ - Colors    │    │ REDIRECT TO  │
            └─────┬────────┘    │ /explore    │
                  │             │ MAIN APP    │
         ┌────────▼────────┐    │             │
         │ GET STARTED     │    └─────────────┘
         │ Button clicked  │
         └────────┬────────┘
                  │
         ┌────────▼────────────────────┐
         │ UPDATE hasCompleted         │
         │ Onboarding = true           │
         └────────┬────────────────────┘
                  │
         ┌────────▼────────────────────┐
         │ REDIRECT TO /explore        │
         │ MAIN APPLICATION START      │
         └────────────────────────────┘
```

---

## 2. Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER AUTHENTICATION FLOW                      │
└─────────────────────────────────────────────────────────────────┘

OPTION A: OAUTH FLOW (Google/ORCID)
──────────────────────────────────────

User                    App                  Provider
 │                       │                      │
 │ Click OAuth Button    │                      │
 ├──────────────────────►│                      │
 │                       │ Redirect to Provider │
 │                       ├─────────────────────►│
 │                       │                      │
 │◄─────────────────────────── OAuth Consent ──┤
 │ (User enters consent screen)                 │
 │                       │                      │
 │ Authorize App         │                      │
 ├──────────────────────────────────────────────┤
 │                       │ Auth Code Returned   │
 │                       │◄─────────────────────┤
 │                       │                      │
 │                       │ Exchange Code for    │
 │                       │ Access Token         │
 │                       ├─────────────────────►│
 │                       │                      │
 │                       │ Access Token + User  │
 │                       │◄─────────────────────┤
 │                       │                      │
 │◄──────── Session Created ─────────┐          │
 │ (httpOnly Cookie)                 │          │
 │                                   │          │
 │                       ┌───────────▼──────────┤
 │                       │ Save to Database     │
 │                       └──────────────────────┤


OPTION B: EMAIL + PASSWORD FLOW
────────────────────────────────

User                    App                  Database
 │                       │                      │
 │ Enter Email           │                      │
 ├──────────────────────►│                      │
 │                       │ Validate Format     │
 │                       │ (Regex)             │
 │                       │                      │
 │ Enter Password        │                      │
 ├──────────────────────►│                      │
 │                       │ Hash Password       │
 │                       │ Compare with DB     │
 │                       ├─────────────────────►│
 │                       │ Password Record     │
 │                       │◄─────────────────────┤
 │                       │ Match? ─────────────►│
 │                       │ (bcrypt compare)    │
 │                       │                      │
 │                       │ YES ──┐              │
 │◄───── Session ────────┼──────┤              │
 │ (Cookie + Token)      │      │              │
 │                       ├──────▼──────────────►│
 │                       │ Create Session      │
 │                       │◄─────────────────────┤
 │                       │ Session Stored      │
 │                       │                      │
 │                       │ NO ───┐              │
 │◄─────── Error ────────┼──────┤              │
 │ "Invalid Password"    │      │              │
```

---

## 3. Session Lifecycle

```
┌──────────────────────────────────────────────────────────────────┐
│                      SESSION LIFECYCLE                            │
└──────────────────────────────────────────────────────────────────┘

TIME: T+0s (LOGIN)
─────────────────────
User logs in
      │
      ▼
SESSION CREATED
├─ Token: random_abc123def456
├─ User ID: user_xyz789
├─ Created At: 2024-01-20T15:30:00Z
├─ Expires At: 2024-01-27T15:30:00Z (7 days)
├─ IP Address: 192.168.1.100
└─ User Agent: Mozilla/5.0...

DATABASE: Session table
├─ id: sess_123
├─ userId: user_xyz789
├─ token: random_abc123def456
├─ expiresAt: 2024-01-27T15:30:00Z
├─ ipAddress: 192.168.1.100
└─ userAgent: Mozilla/5.0...

BROWSER: Set Cookie
├─ Name: ithaca.session
├─ Value: random_abc123def456
├─ HttpOnly: true (can't access via JS)
├─ Secure: true (HTTPS only in prod)
├─ SameSite: Lax (CSRF protection)
├─ Path: /
└─ Expires: 2024-01-27 15:30:00


TIME: T+5 minutes (CLIENT CACHE)
────────────────────────────────
User navigates to different page
      │
      ▼
CHECK SESSION
├─ Read from browser cache (5-min TTL)
├─ Found in cache? YES
├─ Return cached session immediately
└─ No database query needed


TIME: T+5 minutes 1 second (DB REVALIDATION)
─────────────────────────────────────────────
Browser cache expires
      │
      ▼
REVALIDATE SESSION
├─ Send cookie: ithaca.session=random_abc123def456
│
├─→ Middleware receives request
│   ├─ Extract token from cookie
│   ├─ Query database for session
│   ├─ Token found? YES
│   ├─ Expires At > NOW? YES
│   └─ Session valid ✓
│
├─→ Return user data to app
│
└─→ Update cache (next 5 min)


TIME: T+24 hours (SESSION UPDATE)
──────────────────────────────────
Session is still active but 24h old
      │
      ▼
UPDATE SESSION AGE
├─ Update expiresAt: NOW + 7 days
├─ Extends session to: 2024-01-28T15:30:00Z
├─ User doesn't see any change
└─ Transparent session refresh


TIME: T+7 days (SESSION EXPIRES)
─────────────────────────────────
Session reaches expiration time
      │
      ▼
CHECK EXPIRATION
├─ Middleware validates session
├─ Current time > expiresAt? YES
├─ Session EXPIRED
│
├─→ Delete from database
├─→ Clear browser cookie
├─→ Redirect to /signin
└─→ User must log in again


EARLY LOGOUT (User clicks logout)
──────────────────────────────────
User clicks "Sign Out"
      │
      ▼
SIGN OUT HANDLER
├─ Call authClient.signOut()
│
├─→ Backend
│   ├─ Delete session from DB
│   ├─ Clear cookie value
│   └─ Return success
│
├─→ Frontend
│   ├─ Clear session cache
│   ├─ Clear session state
│   └─ Redirect to /
│
└─ User logged out immediately
```

---

## 4. Route Protection Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                 ROUTE PROTECTION MIDDLEWARE                       │
└──────────────────────────────────────────────────────────────────┘

REQUEST ARRIVES
      │
      ▼
┌──────────────────────────────┐
│ IS ROUTE PUBLIC?             │
│ (/, /about, /blog, etc.)     │
└──────┬───────────────────────┘
       │
   YES │            NO
       ▼             │
  ┌─────────┐       │
  │ ALLOW   │       │
  │ ACCESS  │       ▼
  └─────────┘  ┌──────────────────────────────┐
               │ GET SESSION FROM REQUEST     │
               │ - Read httpOnly cookie       │
               │ - Extract token             │
               │ - Query database            │
               └──────┬───────────────────────┘
                      │
                      ▼
               ┌──────────────────────────────┐
               │ SESSION FOUND?               │
               └──────┬───────────────────────┘
                      │
          YES │       │ NO
              │       ▼
              │   ┌─────────────────────┐
              │   │ UNAUTHENTICATED     │
              │   │ session = null      │
              │   └────────┬────────────┘
              │            │
              ▼            ▼
        ┌──────────────────────────────┐
        │ ROUTE TYPE CHECK             │
        └──────┬───────────────────────┘
               │
      ┌────────┼────────┬────────┐
      │        │        │        │
      ▼        ▼        ▼        ▼

AUTH    PUBLIC  PROTECTED  PROTECTED
ROUTE   ROUTE   ROUTE      ROUTE
(signin,(/,etc) (/explore, (/dashboard
 signup)        /projects) etc)
      │
      ├─ Session exists?
      │     │
      │ YES │  NO
      │     │   │
      │ ┌───▼───────────────┐
      │ │ Redirect to       │
      │ │ /explore          │
      │ │ (prevent auth     │
      │ │  pages while      │
      │ │  logged in)       │
      │ └───────────────────┘
      │
      │    ├─ Session exists?
      │    │     │
      │    │ NO  │ YES
      │    │     │
      │    │ ┌───▼────────────────┐
      │    │ │ Redirect to /signin│
      │    │ │ ?callbackUrl=...   │
      │    │ │ (capture where     │
      │    │ │  user came from)   │
      │    │ └────────────────────┘
      │    │
      │    │    └─ Allow access
      │    │       to protected route
      │    │
      │    └─ Allow access
      │       (no auth needed)
      │
      └─ Check session
         validity
         │
         ├─ Token expired?
         │     YES → Redirect to /signin
         │     NO  → Continue
         │
         └─ Token valid in DB?
              YES → Continue
              NO  → Redirect to /signin


ADD SECURITY HEADERS
────────────────────
│
├─ X-Frame-Options: DENY
│  (Prevent clickjacking)
│
├─ X-Content-Type-Options: nosniff
│  (Prevent MIME type sniffing)
│
├─ Referrer-Policy: strict-origin-when-cross-origin
│  (Control referrer information)
│
├─ Permissions-Policy: camera=(), microphone=()
│  (Disable camera, microphone)
│
└─ Content-Security-Policy (in production)
   (Whitelist trusted sources)


ATTACH USER TO CONTEXT
──────────────────────
│
├─ Add session to request headers
├─ Available in server components
├─ Pass user info to components
└─ Use in API routes


RATE LIMITING CHECK
───────────────────
│
├─ Get client IP
├─ Check requests in last 60 seconds
│
├─ Count < 10?
│     YES → Allow request
│     NO  → Return 429 Too Many Requests
│
└─ Include Retry-After header


ALLOW REQUEST
──────────────
│
├─ Request passes all checks
├─ Route middleware executes
├─ Component/Handler receives request
└─ Response sent to client
```

---

## 5. Dashboard State Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                   DASHBOARD STATE FLOW                            │
└──────────────────────────────────────────────────────────────────┘

USER NAVIGATES TO /dashboard
           │
           ▼
┌──────────────────────────────────┐
│ LOAD USER PROFILE               │
├──────────────────────────────────┤
│ Query from database:             │
│ ├─ name                          │
│ ├─ email                         │
│ ├─ image                         │
│ ├─ orcidId                       │
│ ├─ createdAt (member since)      │
│ └─ hasCompletedOnboarding        │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ LOAD STATISTICS                 │
├──────────────────────────────────┤
│ Calculate from database:         │
│ ├─ Saved Graphs Count            │
│ ├─ Collections Count             │
│ ├─ Edges Corrected Count         │
│ ├─ Month-over-month changes      │
│ └─ Recent activity               │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ LOAD RECENT ITEMS                │
├──────────────────────────────────┤
│ Query last 5-10 items:           │
│ ├─ Recent graphs                 │
│ ├─ Recent collections            │
│ ├─ Latest corrections            │
│ └─ Recent searches               │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ RENDER DASHBOARD                 │
├──────────────────────────────────┤
│ Display sections:                │
│ ├─ Profile header                │
│ ├─ Statistics cards              │
│ ├─ Tabbed interface              │
│ ├─ Overview tab (default)        │
│ ├─ My Graphs tab                 │
│ ├─ Collections tab               │
│ ├─ History tab                   │
│ └─ Settings tab                  │
└──────────┬───────────────────────┘
           │
    TAB CLICKED
           │
    ┌──────┼──────┐
    │      │      │
    ▼      ▼      ▼

My Graphs  Collections  History    Settings
Tab        Tab          Tab        Tab
│          │            │          │
│          │            │          ▼
│          │            │      ┌──────────┐
│          │            │      │Profile   │
│          │            │      │Settings  │
│          │            │      └──────────┘
│          │            │
│          │            ▼
│          │        ┌──────────┐
│          │        │Full      │
│          │        │History   │
│          │        │Table     │
│          │        └──────────┘
│          │
│          ▼
│      ┌──────────┐
│      │Grid of   │
│      │Collections
│      └──────────┘
│
▼
┌──────────┐
│Grid of   │
│Graphs    │
└──────────┘
```

---

## 6. Logout Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     LOGOUT FLOW                                   │
└──────────────────────────────────────────────────────────────────┘

USER CLICKS LOGOUT BUTTON
           │
           ▼
┌──────────────────────────────────┐
│ SIGN OUT HANDLER INITIATED       │
└──────────────────────┬────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │ Show Loading State   │
            │ Disable button       │
            │ Show spinner         │
            └──────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ Call authClient.signOut()│
        └──────┬───────────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
    BACKEND      FRONTEND
    ─────────────────────
        │             │
        ▼             ▼
    ┌────────┐    ┌──────────┐
    │Delete  │    │Clear     │
    │session │    │session   │
    │from DB │    │cache     │
    └────┬───┘    └──┬───────┘
         │           │
         ▼           ▼
    ┌────────┐    ┌──────────┐
    │Clear   │    │Clear     │
    │cookie  │    │state     │
    │value   │    │context   │
    └────┬───┘    └──┬───────┘
         │           │
         ▼           ▼
    ┌────────┐    ┌──────────┐
    │Return  │    │Remove    │
    │success │    │auth      │
    │        │    │headers   │
    └────┬───┘    └──┬───────┘
         │           │
         └─────┬─────┘
               │
               ▼
        ┌──────────────────────┐
        │ Logout Complete      │
        └──────┬───────────────┘
               │
               ▼
        ┌──────────────────────┐
        │ REDIRECT TO /        │
        │ (Landing Page)       │
        └──────┬───────────────┘
               │
               ▼
        ┌──────────────────────┐
        │ Browser Navigates    │
        │ to home page         │
        └──────┬───────────────┘
               │
               ▼
        ┌──────────────────────┐
        │ LANDING PAGE LOADS   │
        │ Without session      │
        │ Shows login buttons  │
        └──────────────────────┘
```

---

## 7. Database Transaction Flow

```
┌──────────────────────────────────────────────────────────────────┐
│              DATABASE TRANSACTION FLOW                            │
└──────────────────────────────────────────────────────────────────┘

SIGN UP TRANSACTION
───────────────────

BEGIN TRANSACTION
      │
      ├─ Insert User
      │  INSERT INTO "User" (
      │    id, name, email,
      │    emailVerified, hasCompletedOnboarding,
      │    createdAt, updatedAt
      │  ) VALUES (...)
      │
      ├─ If OAuth:
      │  └─ Insert Account
      │     INSERT INTO "Account" (
      │       userId, accountId, providerId,
      │       accessToken, ...
      │     ) VALUES (...)
      │
      ├─ Create Session
      │  INSERT INTO "Session" (
      │    userId, token, expiresAt,
      │    ipAddress, userAgent
      │  ) VALUES (...)
      │
      └─ If Email+Password:
         └─ Hash password and save
            UPDATE "Account"
            SET password = bcrypt(password)
            WHERE userId = ...

COMMIT or ROLLBACK
      │
      ├─ All succeeds? → COMMIT
      │  (All inserts finalized)
      │
      └─ Any fails? → ROLLBACK
         (All changes undone)


LOGOUT TRANSACTION
──────────────────

BEGIN TRANSACTION
      │
      ├─ Delete Session
      │  DELETE FROM "Session"
      │  WHERE token = 'current_token'
      │
      └─ Invalidate related tokens
         UPDATE "Account"
         SET refreshToken = NULL
         WHERE userId = ...

COMMIT
      │
      └─ Logout finalized


UPDATE USER FLOW
────────────────

BEGIN TRANSACTION
      │
      ├─ Read current User data
      │
      ├─ Validate changes
      │
      ├─ Update User
      │  UPDATE "User"
      │  SET name = 'New Name',
      │      emailVerified = true
      │  WHERE id = ...
      │
      ├─ Create audit log
      │  INSERT INTO "AuditLog" ...
      │
      └─ Invalidate cache
         (Clear session cache)

COMMIT or ROLLBACK
```

---

## 8. OAuth Provider Interaction

```
┌──────────────────────────────────────────────────────────────────┐
│           OAUTH PROVIDER INTERACTION FLOW                         │
└──────────────────────────────────────────────────────────────────┘

STEP 1: AUTHORIZATION REQUEST
───────────────────────────────

Ithaca App                          Google/ORCID
      │                                   │
      │ User clicks "Sign in with        │
      │ Google/ORCID"                    │
      │                                   │
      │ Construct URL:                    │
      │ GET https://provider.com/oauth/   │
      │ authorize?                        │
      │   client_id=XXX                   │
      │   redirect_uri=http://            │
      │   localhost:3000/api/auth/        │
      │   callback/google                 │
      │   scope=profile,email             │
      │   state=random_string             │
      │                                   │
      ├──────────────────────────────────►│
      │                                   │
      │                          User sees consent
      │                          screen showing
      │                          what permissions
      │                          app is requesting
      │                                   │
      │ User clicks "Authorize Ithaca"   │
      │◄──────────────────────────────────┤
      │ Redirect with auth code           │


STEP 2: AUTHORIZATION CODE EXCHANGE
─────────────────────────────────────

Ithaca Backend                      Google/ORCID
      │                                   │
      │ Receive redirect with code        │
      │ Extract code and state            │
      │ Verify state matches              │
      │                                   │
      │ POST https://provider.com/oauth/  │
      │ token                             │
      │   grant_type=authorization_code   │
      │   code=AUTH_CODE                  │
      │   client_id=XXX                   │
      │   client_secret=YYY               │
      │   redirect_uri=...                │
      │                                   │
      ├──────────────────────────────────►│
      │                                   │
      │ Provider validates:               │
      │ ├─ Code valid?                    │
      │ ├─ Client ID matches?             │
      │ ├─ Client secret correct?         │
      │ └─ Redirect URI matches?          │
      │                                   │
      │◄──────────────────────────────────┤
      │ Response:                         │
      │ {                                 │
      │   access_token: "...",            │
      │   token_type: "Bearer",           │
      │   expires_in: 3600,               │
      │   refresh_token: "..." (maybe)    │
      │ }                                 │


STEP 3: GET USER PROFILE
─────────────────────────

Ithaca Backend                      Google/ORCID
      │                                   │
      │ GET https://provider.com/user    │
      │ Header:                           │
      │   Authorization: Bearer           │
      │   ACCESS_TOKEN                    │
      │                                   │
      ├──────────────────────────────────►│
      │                                   │
      │◄──────────────────────────────────┤
      │ Response:                         │
      │ {                                 │
      │   id: "provider_user_id",         │
      │   name: "John Doe",               │
      │   email: "john@example.com",      │
      │   picture: "https://...",         │
      │   ... (provider specific fields)  │
      │ }                                 │


STEP 4: CREATE OR UPDATE USER RECORD
─────────────────────────────────────

Ithaca Backend                    PostgreSQL
      │                                   │
      │ Check: User exists?               │
      │ Query by email or provider ID     │
      │                                   │
      ├──────────────────────────────────►│
      │ SELECT * FROM "User" ...          │
      │                                   │
      │◄──────────────────────────────────┤
      │ User found? or Not found?         │
      │                                   │
      ├─── If NOT found:                  │
      │    INSERT new User                │
      │    INSERT new Account             │
      │                                   │
      ├─── If found:                      │
      │    UPDATE Account with new tokens │
      │    User already linked            │
      │                                   │
      └─ Continue to session creation


STEP 5: SESSION CREATION & REDIRECT
────────────────────────────────────

Ithaca Backend                    Browser
      │                                   │
      │ Create Session                    │
      │ Generate token                    │
      │ Save to database                  │
      │                                   │
      │ HTTP Response:                    │
      │ 302 Redirect                      │
      │ Location: /explore                │
      │ Set-Cookie: ithaca.session=token  │
      │                                   │
      ├──────────────────────────────────►│
      │                                   │
      │                     Browser stores
      │                     cookie
      │                     Navigates to
      │                     /explore
      │
      └─ App loaded with authenticated
         user context
```

---

## 9. Security Checkpoint Flow

```
┌──────────────────────────────────────────────────────────────────┐
│               SECURITY CHECKPOINT FLOW                            │
└──────────────────────────────────────────────────────────────────┘

REQUEST RECEIVED
      │
      ▼
┌──────────────────────────────┐
│ CHECKPOINT 1: RATE LIMIT     │
├──────────────────────────────┤
│ Get client IP                │
│ Check request count          │
│ (max 10/minute)              │
│                              │
│ Count exceeded?              │
│   YES → Return 429           │
│   NO  → Continue             │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ CHECKPOINT 2: CSRF TOKEN     │
├──────────────────────────────┤
│ For POST/PUT/DELETE:         │
│ ├─ Get CSRF token from       │
│ │  cookie or header          │
│ ├─ Verify token exists       │
│ ├─ Validate token value      │
│                              │
│ Token invalid?               │
│   YES → Return 403           │
│   NO  → Continue             │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ CHECKPOINT 3: SESSION        │
├──────────────────────────────┤
│ For protected routes:        │
│ ├─ Extract session cookie    │
│ ├─ Query database            │
│ ├─ Validate token            │
│ ├─ Check expiration          │
│ ├─ Get user from session     │
│                              │
│ Session invalid/expired?     │
│   YES → Return 401           │
│   NO  → Continue             │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ CHECKPOINT 4: PERMISSIONS    │
├──────────────────────────────┤
│ For admin routes:            │
│ ├─ Get user role from session│
│ ├─ Check against required    │
│ │  permissions               │
│                              │
│ Permission denied?           │
│   YES → Return 403           │
│   NO  → Continue             │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ CHECKPOINT 5: INPUT          │
├──────────────────────────────┤
│ Validation                   │
│ ├─ Type validation (Zod)     │
│ ├─ Size limits               │
│ ├─ SQL injection checks      │
│ ├─ XSS prevention            │
│                              │
│ Validation failed?           │
│   YES → Return 400           │
│   NO  → Continue             │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ SECURITY HEADERS ADDED       │
├──────────────────────────────┤
│ ├─ X-Frame-Options: DENY     │
│ ├─ X-Content-Type: nosniff   │
│ ├─ Referrer-Policy           │
│ ├─ Permissions-Policy        │
│ └─ CSP (production)           │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ REQUEST HANDLER EXECUTES     │
│ (All checks passed)          │
└──────────────────────────────┘
```

---

## 10. Complete State Machine

```
┌──────────────────────────────────────────────────────────────────┐
│                  USER STATE MACHINE                               │
└──────────────────────────────────────────────────────────────────┘

States:
───────

1. UNAUTHENTICATED
   ├─ No session
   ├─ No cookie
   ├─ Can only access public routes
   └─ Can see Sign In / Sign Up buttons

2. AUTHENTICATING
   ├─ Authentication in progress
   ├─ User credentials being verified
   ├─ Show loading state
   └─ Prevent double submission

3. AUTHENTICATED
   ├─ Valid session
   ├─ Session cookie present
   ├─ Can access protected routes
   ├─ User menu available
   └─ Can perform actions

4. SESSION_EXPIRED
   ├─ Session older than 7 days
   ├─ or manually invalidated
   ├─ Cookie still in browser
   ├─ Database session deleted
   └─ Need to re-authenticate

5. LOGGING_OUT
   ├─ Logout request in progress
   ├─ Session being terminated
   ├─ Show loading state
   └─ Prevent other requests

State Transitions:
──────────────────

UNAUTHENTICATED
      │
      ├─ User clicks Sign In/Up
      │
      ▼
AUTHENTICATING
      │
      ├─ Credentials verified ✓
      │           ▼
      │    AUTHENTICATED
      │
      ├─ Credentials invalid ✗
      │           ▼
      │    UNAUTHENTICATED
      │    (Show error)


AUTHENTICATED
      │
      ├─ Time passes (7 days)
      │           ▼
      │    SESSION_EXPIRED
      │           ▼
      │    Redirect to /signin
      │           ▼
      │    UNAUTHENTICATED
      │
      ├─ User clicks Logout
      │           ▼
      │    LOGGING_OUT
      │           ▼
      │    UNAUTHENTICATED
      │
      └─ User navigates (every 5 min)
                 ▼
         Revalidate session
         Still valid?
             ▼
         Stay AUTHENTICATED
             OR
         Go to SESSION_EXPIRED


Transitions with Middleware:
─────────────────────────────

Request to /signin?
│
├─ UNAUTHENTICATED → Allow
├─ AUTHENTICATING → Allow
├─ AUTHENTICATED → Redirect to /explore
├─ SESSION_EXPIRED → Allow (re-login)
└─ LOGGING_OUT → Allow


Request to /explore?
│
├─ UNAUTHENTICATED → Redirect to /signin
├─ AUTHENTICATING → Wait (loading)
├─ AUTHENTICATED → Allow
├─ SESSION_EXPIRED → Redirect to /signin
└─ LOGGING_OUT → Redirect to /


Request to /dashboard?
│
├─ UNAUTHENTICATED → Redirect to /signin
├─ AUTHENTICATING → Wait (loading)
├─ AUTHENTICATED → Allow
├─ SESSION_EXPIRED → Redirect to /signin
└─ LOGGING_OUT → Redirect to /
```

This comprehensive visual documentation provides clear understanding of all authentication flows and state transitions in the Ithaca UI application.
