# ExamPrep Ethiopia -- Lovable Mobile App Prompt Package

> This document contains everything Lovable needs to design a mobile-first iOS/Android frontend that is a **faithful adaptation** of the existing ExamPrep Ethiopia web application. Each section can be pasted into Lovable as a standalone prompt or combined into a sequence of prompts.

---

## Web App Analysis

### Product purpose

ExamPrep Ethiopia is an exam-preparation platform for Ethiopian students in Grades 9-12 preparing for the national exam. Students practice multiple-choice questions organised by subject, grade, and chapter/topic. The platform tracks accuracy, coverage, and streaks, offers timed mock exams that simulate real exam conditions, and includes a competitive leaderboard. A freemium subscription model gates unlimited question access behind paid plans (Monthly / Quarterly / Yearly) with Ethiopian payment methods (Telebirr, CBE Birr, bank transfer).

### Brand identity

- **Name**: "examprep" (lowercase in the logo mark), "Exam Prep Ethiopia" in metadata.
- **Logo**: A rounded square with accent-gradient background containing a bold white lowercase "e", paired with the word "examprep" in semibold type.
- **Tagline on login**: "Sign in to continue your preparation."
- **Tagline on register**: "Start preparing for your exams today."
- **Tagline on dashboard**: "Your dashboard is ready. Keep building your streak."

### Major user flows

1. **Auth**: Register (name, email, phone, password) -> Login -> Dashboard. Forgot/reset password via email.
2. **Study**: Dashboard -> Subjects (filter by grade) -> Subject topics/chapters -> Practice (MCQ one-at-a-time, submit, feedback, bookmark, session summary).
3. **Mock exams**: Dashboard -> Mock Exams -> choose subject/grade -> start timed attempt -> answer questions with navigator/flag -> submit -> results with per-question review.
4. **Progress**: Dashboard -> Progress (accuracy donut, coverage donut, daily goal ring, radar chart, weak topics, per-subject and per-grade breakdowns).
5. **Bookmarks**: Save questions during practice -> Bookmarks page (filter by subject/grade) -> Practice bookmarked-only mode.
6. **Leaderboard**: Weekly / Monthly / All-Time rankings filtered by subject.
7. **Subscription**: Free tier with limited questions per subject -> Subscribe page (plan cards, payment methods) -> Account subscription status and payment history.
8. **Privacy**: Consent toggles (analytics, personalisation, marketing), delete account.

### Main screens

| # | Screen | Route | Purpose |
|---|--------|-------|---------|
| 1 | Landing | `/` | Marketing page with hero, feature cards, CTA |
| 2 | Login | `/login` | Email + password sign-in |
| 3 | Register | `/register` | Full name, email, phone, password, terms |
| 4 | Forgot Password | `/forgot-password` | Email-only form |
| 5 | Reset Password | `/reset-password` | New password + confirm |
| 6 | Dashboard | `/dashboard` | Welcome, stats, continue learning, upcoming exams, subject progress |
| 7 | Subjects | `/subjects` | Grade filter pills, subject cards with coverage/accuracy |
| 8 | Subject Topics | `/subjects/[id]/topics` | Chapter cards, set current, practice link |
| 9 | Practice | `/practice` | Question card, MCQ options, submit, feedback, bookmark, session summary |
| 10 | Mock Exam List | `/mock-exams` | Exam cards grouped by subject, start confirm modal |
| 11 | Mock Exam Subjects | `/mock-exams/subjects` | Subject grid with exam counts |
| 12 | Mock Exam Grades | `/mock-exams/subjects/[id]/grades` | Grade cards linking to exam list |
| 13 | Mock Exam Attempt | `/mock-exams/[id]/attempt` | Timer, question navigator grid, flag, MCQ, submit modal |
| 14 | Mock Exam Results | `/mock-exams/attempts/[attemptId]` | Score, time, incorrect count, per-question review |
| 15 | Bookmarks | `/bookmarks` | Subject/grade dropdown filters, bookmark list, "Practice Bookmarked" CTA |
| 16 | Progress | `/progress` | Donut charts, radar, weak topics, per-subject/grade breakdowns |
| 17 | Leaderboard | `/leaderboard` | Period pills, subject filter, your rank, ranking list |
| 18 | Subscribe | `/subscribe` | Plan cards, payment method tiles, initiate payment |
| 19 | Account Subscription | `/account/subscription` | Current plan badge, payment history |
| 20 | Privacy & Data | `/account/privacy` | Consent toggles, delete account |

### Design system tokens

**Color palette (dark mode -- the primary experience)**

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#0f1218` | Page background |
| `--foreground` | `#f5f7fb` | Primary text |
| `--surface-color` | `#171c25` | Card/panel background |
| `--surface-muted` | `#1f2632` | Secondary surfaces, hover states |
| `--border-color` | `#313b4b` | Card borders, dividers |
| `--accent-color` | `#d3a169` | Primary accent (buttons, links, focus rings) |
| `--accent-strong` | `#f4cc9f` | Strong accent for emphasis text |
| `--edu-topbar-bg` | `#18202b` | Top bar background |
| `--edu-hero-bg` | `#171d27` | Hero/card inner background |

**Color palette (light mode)**

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#fffbf4` | Warm cream page background |
| `--foreground` | `#35281c` | Dark brown text |
| `--surface-color` | `#fffdf8` | Card background |
| `--surface-muted` | `#f4ead7` | Secondary surfaces |
| `--border-color` | `#e0cdb0` | Borders |
| `--accent-color` | `#c49a6c` | Golden accent |
| `--accent-strong` | `#8f6132` | Dark brown accent |

**Typography**

- Primary: Geist Sans (clean geometric sans-serif)
- Monospace: Geist Mono
- Ethiopian script: Noto Sans Ethiopic (for Amharic content)
- Weights used: 400 (body), 500 (labels), 600 (semibold headings, buttons), 700 (bold headings, stats)
- Body: 14-16px, labels: 12-13px uppercase tracking-wide, headings: 20-36px

**Spacing and layout**

- Page padding: 24px horizontal on mobile
- Card padding: 16px (sm), 20px (md), 24px (lg)
- Section gaps: 16-24px vertical
- Grid gaps: 12-16px
- Stat card grids: 2-col on mobile, 4-col on desktop

**Corner radius**

- Cards: 24px (`rounded-3xl`)
- Inner cards/sub-panels: 16px (`rounded-2xl`)
- Buttons: fully rounded 9999px (`rounded-full`)
- Modals: 16px (`rounded-2xl`)
- Badges: 8px (`rounded-lg`)
- Brand mark/logo: 12-16px (`rounded-xl` to `rounded-2xl`)

**Shadows**

- Cards: layered shadow with subtle accent glow: `0 16px 34px rgba(accent, 6%)` + `inset 0 1px 0 rgba(white, 8%)`
- Hover: enhanced glow `0 22px 44px rgba(accent, 22%)`
- Buttons (primary): `shadow-md` with accent tint
- Modals: `shadow-2xl`
- Toasts: compact shadow, dark stone palette

**Card style**

- Background: `--edu-hero-bg` or `--surface-color` with subtle gradient
- Border: 1px solid `--border-color`
- Decorative layers: dot-grid pattern, sheen gradient, spotlight radial, corner orb
- Hover: `-translate-y-0.5`, border color shifts toward accent, enhanced shadow
- All cards use `data-ui-card="true"` attribute for consistent decoration

**Button variants**

| Variant | Style |
|---------|-------|
| Primary | Solid accent background, white text, accent shadow, darkens on hover |
| Secondary | Solid foreground background, background-color text |
| Outline | Border + surface background, foreground text, muted hover |
| Ghost | Transparent, foreground text, muted background on hover |
| Danger | Solid red-600, white text, red shadow |

All buttons: `rounded-full`, font-semibold, sizes sm (h-8), md (h-10), lg (h-12). Loading state shows inline spinner.

**Form inputs**

- Label above input in semibold
- Rounded pill shape for selects (`rounded-full`)
- Rounded-xl for text inputs
- Border: `--border-color`, focus: `--accent-color` ring
- Error text in red below the field
- Password fields include strength meter (weak/medium/strong colour bar)

**Badges**

- Small rounded-lg pills with ring-inset border
- Variants: default (muted), success (accent tint), warning (stronger accent), danger (red), easy (green-accent), medium (amber-accent), hard (red)

**Empty states**

- Centered layout, py-16
- Title: semibold 14px
- Optional description: 14px muted
- Optional action button below

**Loading states**

- Skeleton blocks matching content dimensions
- Progress page: special loading splash with concentric spinning rings and rotating motivational messages
- Button loading: inline spinner SVG replacing content

**Error states**

- Red-bordered Card with error message + "Retry" outline button
- Inline red paragraph on auth forms
- Toast errors for async operations

**Toast notifications**

- Position: top-right
- Duration: 4 seconds
- Dark rounded styling (stone palette)
- Success and error icon variants

**Navigation (web)**

- Collapsible left sidebar on desktop (hover/pin to expand)
- Hamburger + overlay on mobile
- Pill-style breadcrumbs on inner pages (e.g. "Dashboard / Subjects / Practice")
- Horizontal pill navigation (PillNav) for grade filters, difficulty filters, dashboard shortcuts, leaderboard period tabs

**Icon usage**

- Untitled UI icon set (`@untitledui/icons`)
- Minimal icon usage -- mostly in sidebar navigation
- Brand mark: white "e" on accent gradient square

**Copy and tone**

- Professional but approachable
- Direct and concise labels
- Encouragement-oriented ("Keep building your streak", "Great work", "Focus on one weak area today")
- Ethiopian context: grade levels 9-12, Ethiopian calendar years for exam questions, Ethiopian payment methods (Telebirr, CBE Birr)
- Key terms: subjects, chapters, topics, practice, attempts, coverage, accuracy, streak, weak topics, mock exams, bookmark, subscribe, free tier, premium

---

## SECTION A -- MASTER PROMPT

```
You are designing a mobile-first frontend for iOS and Android for an existing web application called "ExamPrep Ethiopia" (brand name: "examprep"). This is NOT a new product. You are adapting an existing, working web app into a mobile form factor.

PRODUCT SUMMARY:
ExamPrep Ethiopia is an exam-preparation platform for Ethiopian students (Grades 9-12) preparing for national exams. Students practice multiple-choice questions organised by subject, grade, and chapter. The app tracks accuracy, coverage, and streaks, offers timed mock exams, has a competitive leaderboard, bookmarks, and a freemium subscription model with Ethiopian payment methods (Telebirr, CBE Birr, bank transfer).

YOUR GOAL:
Create a React Native / Expo mobile frontend (or React-based mobile-optimised web app) that:
1. Preserves the EXACT same branding, visual identity, and product feel as the existing web app
2. Adapts all existing screens for mobile form factor (stacked layouts, bottom tab navigation, thumb-friendly touch targets)
3. Uses the same colour palette, typography feel, corner radii, and card style
4. Keeps all field names, labels, copy, and terminology identical
5. Does NOT invent new features or change the product's information architecture
6. Assumes the same backend API exists at /api/v1 (NestJS + PostgreSQL)

BRAND IDENTITY:
- Name: "examprep" (lowercase in logo)
- Logo: rounded square with warm golden gradient containing bold white "e", paired with "examprep" text
- Warm golden accent palette on dark navy/slate backgrounds (dark mode primary)
- Light mode: warm cream backgrounds with brown text and golden accents
- Typography: clean geometric sans-serif (Geist Sans equivalent), with Noto Sans Ethiopic for Amharic content
- Cards: large 24px radius, subtle accent-glow shadows, hover lift effect
- Buttons: fully rounded pill shape, golden accent primary colour
- Overall feel: premium, clean, education-focused, Ethiopian context

DARK MODE IS THE PRIMARY EXPERIENCE (as shown in the screenshots). Light mode should also be supported.

SCREENS TO BUILD (in priority order):
1. Login / Register / Forgot Password / Reset Password
2. Dashboard (welcome, 4 stat cards, continue learning, upcoming mock exams, subject progress grid)
3. Subjects (grade filter pills, subject cards with coverage bars)
4. Subject Topics / Chapters (chapter list with coverage, practice buttons)
5. Practice (question card, MCQ options A-D, submit, correct/incorrect feedback with explanation, bookmark toggle, session summary)
6. Mock Exams (exam list, subject/grade chooser, timed attempt with question navigator, results page)
7. Bookmarks (filter dropdowns, bookmark list, "Practice Bookmarked" button)
8. Progress (accuracy/coverage donut charts, daily goal ring, radar chart for strengths, weak topics list, per-subject and per-grade breakdowns)
9. Leaderboard (period tabs, subject filter, your rank card, ranking list)
10. Subscribe (plan cards: Monthly/Quarterly/Yearly, payment method tiles, initiate flow)
11. Account Subscription (current plan, payment history)
12. Privacy & Data (consent toggles, delete account)

MOBILE NAVIGATION:
Replace the web sidebar with a bottom tab bar containing:
- Home (Dashboard)
- Subjects
- Practice (or Mock Exams)
- Progress
- More (Bookmarks, Leaderboard, Subscribe, Account, Privacy)

Use a top app bar with the "examprep" logo and contextual actions (back arrow, logout).
Use breadcrumb-style navigation labels where needed.

Do NOT include a marketing/landing page in the mobile app. The mobile app should open directly to Login (if unauthenticated) or Dashboard (if authenticated).
```

---

## SECTION B -- DESIGN SYSTEM PROMPT

```
Apply this exact design system to every screen in the mobile app. Do not deviate from these tokens.

COLOUR PALETTE (Dark Mode -- Primary):
- Background: #0f1218 (deep navy-slate)
- Foreground / primary text: #f5f7fb (near-white)
- Surface / card background: #171c25
- Surface muted / secondary panels: #1f2632
- Border: #313b4b
- Accent: #d3a169 (warm gold)
- Accent strong / emphasis text: #f4cc9f (light gold)
- Topbar background: #18202b
- Hero/inner card bg: #171d27
- Error: red-600 for danger buttons, red-500 for error text
- Success accent: same gold accent tones (not green)

COLOUR PALETTE (Light Mode):
- Background: #fffbf4 (warm cream)
- Foreground: #35281c (dark brown)
- Surface: #fffdf8
- Surface muted: #f4ead7
- Border: #e0cdb0
- Accent: #c49a6c (golden brown)
- Accent strong: #8f6132 (deep brown)

TYPOGRAPHY:
- Use a clean geometric sans-serif font (Inter, SF Pro, or system default as Geist Sans equivalent)
- Include Noto Sans Ethiopic for Amharic text support
- Font weights: 400 body, 500 medium labels, 600 semibold for buttons/sub-headings, 700 bold for main headings and stat numbers
- Heading sizes: 28-36px for page titles, 20px for section headings, 16-18px for card titles
- Body: 14-16px
- Labels/hints: 11-13px, uppercase tracking-wide for stat labels
- Stat numbers: 24-32px bold

SPACING:
- Screen padding: 16-20px horizontal
- Card internal padding: 16px (compact), 20px (default), 24px (spacious)
- Vertical gaps between sections: 16-24px
- Vertical gaps between cards in a list: 12-16px
- Touch target minimum: 44px height

CORNER RADIUS:
- Cards: 24px
- Inner sub-cards/panels: 16px
- Buttons: 9999px (fully rounded pill)
- Input fields: 9999px for selects/pills, 12-16px for text inputs
- Modals / bottom sheets: 16-24px top corners
- Badges: 8px
- Logo mark: 12-16px

SHADOWS:
- Cards: subtle layered shadow with accent tint -- e.g. 0 12px 34px rgba(0,0,0,0.28) + inset highlight
- Card hover/press: slightly elevated shadow with stronger accent glow
- Primary buttons: medium shadow with accent colour tint
- Modals: large shadow (shadow-2xl equivalent)
- Keep shadows soft and warm-toned, matching the golden accent

CARD COMPONENT:
- Background: surface-color with subtle gradient overlay
- Border: 1px solid border-color
- Radius: 24px
- Optional decorative layers (dot grid, sheen, subtle orb) to match web app's premium feel
- Press/active state: slight scale down or shadow change (mobile equivalent of hover lift)

BUTTON VARIANTS:
- Primary: solid accent-color background (#d3a169 dark / #c49a6c light), white text, accent shadow
- Secondary: solid foreground background, inverted text
- Outline: border + surface background, foreground text
- Ghost: transparent, just text, muted bg on press
- Danger: solid red-600, white text

All buttons: fully rounded pill shape, minimum height 44px on mobile, semibold text, 14-15px font size.

FORM INPUTS:
- Text inputs: rounded-xl (12-16px radius), 1px border, surface background
- Pill selects/dropdowns: fully rounded, gradient surface background
- Labels: above input, 12-13px semibold
- Error text: red, 12px, below field
- Focus state: accent-color border + subtle accent ring
- Password strength indicator: colour bar (red -> amber -> accent-gold)

BADGES:
- Small rounded pills (8px radius)
- Variants: default (muted surface), success (accent tint), warning (stronger accent), danger (red), difficulty levels (easy=accent-light, medium=accent, hard=red)

EMPTY STATES:
- Centered vertically in container
- Title: 14px semibold
- Description: 14px muted text, max 280px width
- Optional action button below

LOADING STATES:
- Skeleton placeholders matching content shape
- Button loading: inline spinner replacing text
- Full-page loading: concentric spinning rings with accent colours

TOAST NOTIFICATIONS:
- Bottom of screen (mobile convention) or top
- 4-second duration
- Dark rounded card style
- Success (accent) and error (red) variants

ICONS:
- Use a consistent line-icon set (Lucide, Phosphor, or similar clean line icons)
- Minimal icon usage -- primarily in tab bar, navigation, and action buttons
- Match the understated, professional tone of the web app
```

---

## SECTION C -- MOBILE ADAPTATION RULES

```
Follow these rules when converting the web app screens to mobile. The goal is adaptation, not redesign.

LAYOUT RULES:
1. Convert all multi-column desktop grids to single-column stacked layouts on mobile
2. 2-column stat card grids on mobile (2x2 for 4 stats), single column for larger cards
3. Replace the desktop sidebar navigation with a bottom tab bar (5 tabs max)
4. Replace desktop breadcrumbs with a top app bar showing screen title + back arrow
5. Keep the "examprep" logo in the top-left of the app bar (small version)
6. Use full-width cards instead of constrained max-width containers
7. Horizontal scrolling pill rows for filters (grade pills, difficulty pills, period tabs) -- do not stack them vertically

NAVIGATION ADAPTATION:
- Web sidebar groups: "Home" (Dashboard, Subjects, Practice, Mock Exams, Bookmarks) and "Dashboard" (Progress, Leaderboard, Subscription, Privacy)
- Mobile bottom tabs: Home, Subjects, Mock Exams, Progress, More
- The "More" tab should open a screen with links to: Bookmarks, Leaderboard, Subscribe, Subscription Status, Privacy & Data, Log Out
- Deep links within flows (e.g. Subject -> Topics -> Practice) should use standard stack navigation with back arrows
- Keep the same URL/route hierarchy conceptually

PRESERVE EXACTLY:
- All screen titles and headings (e.g. "Choose a Subject", "Practice Questions", "Session Summary", "Progress Dashboard")
- All field labels (e.g. "Email", "Password", "Full Name", "Phone Number")
- All stat card titles (e.g. "Answered Today", "Overall Accuracy", "Current Streak", "Strongest Subject")
- All stat card hints (e.g. "Questions answered in the last 24h", "Across all subjects", "Consecutive active days")
- All button labels (e.g. "Sign in", "Create account", "Submit answer", "Next question", "Continue practicing", "Subscribe to access", "Practice Bookmarked")
- All empty state messages (e.g. "No recent activity yet", "Start by choosing a subject to build your learning path.", "No bookmarks found", "No questions available for this filter")
- All toast messages (e.g. "Logged in successfully.", "Question bookmarked.", "Bookmark removed.")
- The "e" brand mark and "examprep" wordmark
- The warm golden accent colour identity

FORMS:
- Make all form inputs full-width on mobile
- Minimum touch target: 44px height for buttons and inputs
- Place primary action button at the bottom of forms, full-width
- Keep the same validation messages and error display patterns
- Password strength bar must remain

PRACTICE FLOW (critical):
- One question at a time (same as web)
- Question text in a card at the top
- MCQ options as large tappable cards/buttons below (not tiny radio buttons)
- Clear selected state with accent highlight
- "Submit answer" button, then "Next question" button
- After submit: show correct/incorrect feedback card with explanation
- Bookmark toggle button near question number
- End of session: summary card with score, accuracy, time, incorrect review
- Difficulty filter pills at top (All / Easy / Medium / Hard)
- Free-tier remaining banner when applicable

MOCK EXAM FLOW (critical):
- Timer prominently displayed at top
- Question navigator as a scrollable grid of numbered circles
- Flag toggle for marking questions to review
- Submit confirmation modal (use bottom sheet on mobile)
- Results page with score breakdown and per-question review list

DO NOT:
- Do not replace cards with tables (the web app already uses cards everywhere, not tables)
- Do not add swipe gestures for question navigation unless it is a clear improvement
- Do not remove the bookmark functionality from practice
- Do not change the MCQ option display order (A, B, C, D)
- Do not change any stat calculations or label text
- Do not merge screens that are separate in the web app
- Do not add onboarding screens that do not exist in the web app
- Do not add social features that do not exist
- Do not add push notification UI unless specifically requested
- Do not change the subscription plans or payment method options
```

---

## SECTION D -- SCREEN-BY-SCREEN PROMPTS

### Screen 1: Login

```
Design a mobile Login screen for the "examprep" app.

LAYOUT:
- Centered vertically on screen
- "examprep" logo at top: golden gradient rounded square with white "e" + "examprep" wordmark
- Subtle radial gradient background (accent tint at top-right, muted at bottom-left)

CARD CONTENT:
- Heading: "Welcome back"
- Subheading: "Sign in to continue your preparation"
- Form fields:
  - "Email" (email input, placeholder "you@example.com")
  - "Password" (password input, placeholder "Enter your password")
- Row between fields: "Remember me" checkbox (left), "Forgot password?" link (right, accent colour)
- Error banner: red-bordered rounded card with error message (shown when login fails)
- "Sign in" primary button, full width, with loading spinner state

BELOW CARD:
- "Don't have an account? Sign up free" with "Sign up free" as an accent-coloured link

STATES:
- Default (empty form)
- Validation errors (inline below fields)
- Submit error (red banner above button)
- Loading (button shows spinner, fields disabled)
```

### Screen 2: Register

```
Design a mobile Register screen for "examprep".

LAYOUT: Same centered card layout as Login.

CARD CONTENT:
- Heading: "Create your account"
- Subheading: "Start preparing for your exams today"
- Form fields (all full-width):
  - "Full Name" (text, placeholder "Abebe Bekele")
  - "Email" (email, placeholder "you@example.com")
  - "Phone Number" (tel, placeholder "+251912345678 or 0912345678")
  - "Password" (password, placeholder "Create a strong password")
  - Password strength bar below password field: "Password strength" label + "Weak"/"Medium"/"Strong" + colour bar (red/amber/gold)
  - "Confirm Password" (password, placeholder "Repeat your password")
- "I agree to the Terms of Service and Privacy Policy." checkbox
- Error states: inline field errors + banner for API errors
- "Create account" primary button, full width, loading state

BELOW CARD:
- "Already have an account? Sign in" link
```

### Screen 3: Forgot Password

```
Design a mobile Forgot Password screen.

LAYOUT: Same centered card layout.
- Heading: "Forgot password"
- Subheading: "Enter your email and we'll send a reset link."
- Single field: "Email" (email input)
- "Send reset link" primary button
- "Back to sign in" link below
```

### Screen 4: Reset Password

```
Design a mobile Reset Password screen.

LAYOUT: Same centered card layout.
- Heading: "Reset password"
- Fields: "New Password" + "Confirm Password"
- "Reset password" primary button
- Success state: confirmation message with link to login
```

### Screen 5: Dashboard

```
Design the main Dashboard screen (home tab) for the "examprep" mobile app.

TOP SECTION:
- Top app bar with "examprep" logo (small "e" mark + wordmark)
- Welcome message: "Welcome back, {userName}" (bold, 24-28px)
- Rotating subtitle messages:
  - "Your dashboard is ready. Keep building your streak one chapter at a time."
  - "Focus on one weak area today and convert it into a strength."
  - "Consistency beats intensity. A few strong sessions today goes a long way."

QUICK NAV PILLS (horizontal scroll):
- "Mock Exams", "Subjects", "Progress", "Bookmarks", "Leaderboard", "Subscribe", "Subscription Status", "Privacy & Data"

STAT CARDS (2x2 grid):
1. "ANSWERED TODAY" / {number} / "Questions answered in the last 24h"
2. "OVERALL ACCURACY" / {percentage}% / "Across all subjects"
3. "CURRENT STREAK" / {number} days / "Consecutive active days"
4. "STRONGEST SUBJECT" / {subject name} / "Highest attempt volume so far"

Each stat card: surface background, 24px radius, uppercase tracking-wide label, large bold value, small muted hint.

CONTINUE LEARNING SECTION:
- Card with heading "Continue Learning" and subheading "Jump back into your recent subject and topic."
- If recent activity exists: inner card showing "Last topic" label, "{Subject} - Grade {N}" title, topic name, "Continue" secondary button
- If no recent activity: EmptyState -- "No recent activity yet" / "Start by choosing a subject to build your learning path." / "Browse subjects" button

UPCOMING MOCK EXAMS SECTION:
- Card with heading "Upcoming Mock Exams" / "Suggestions based on available exams."
- List of up to 3 exam cards: title, "{Subject} - Grade {N} - {duration} min"
- Empty: "No mock exams available yet."

SUBJECT PROGRESS SECTION:
- Card with heading "Subject Progress" + "Open subjects" link (accent colour)
- Grid of subject mini-cards: subject name, "{coverage}% covered", progress bar (teal), "{accuracy}% accuracy - {attempts} attempt(s)"
- Empty: "No attempts yet. Start with any subject."

STATES: Loading (skeleton blocks for all sections), Error (red card with "Retry" button)
```

### Screen 6: Subjects

```
Design the Subjects screen.

TOP: App bar with back arrow + "Subjects" title
BREADCRUMB CONTEXT: "Dashboard / Subjects"

CONTENT:
- Heading: "Choose a Subject"
- Subheading: "Select a grade first, then pick a subject to choose your chapter."
- Grade filter pills (horizontal scroll): "Grade 9", "Grade 10", "Grade 11", "Grade 12" -- tappable, toggle active state
- Subject cards grid (single column on mobile, each card full width):
  - Label: "SUBJECT" (uppercase, small)
  - Subject name (18px semibold)
  - Tag in top-right: subject icon or "Study"
  - Coverage line: "{attempted}/{total} questions covered" + "{coverage}%"
  - Progress bar (teal colour)
  - Bottom text: "{accuracy}% accuracy across {attempts} attempt(s)" or "No attempts yet"
  - Tapping card navigates to Subject Topics

STATES:
- Loading: skeleton cards
- Empty (no subjects): "No subjects available" / "Try again in a moment once subjects are loaded."
- Filtered empty: "No subjects for this grade" / "Try another grade or clear the filter to see all subjects."
- Error: red card + Retry
```

### Screen 7: Subject Topics / Chapters

```
Design the Subject Topics screen (chapter list within a subject).

TOP: App bar with back arrow
BREADCRUMB CONTEXT: "Dashboard / Subjects / Topics"

CONTENT:
- Grade filter pills (same as Subjects page)
- Chapter cards (numbered): "Chapter {N}"
  - Coverage info per chapter
  - "Set current" button (saves to lastLearningContext for Continue Learning)
  - "Practice" button (navigates to Practice with topicId/subjectId/gradeId/chapter query params)

STATES: Loading, empty, error (same patterns as Subjects)
```

### Screen 8: Practice

```
Design the Practice screen -- the core learning experience.

TOP: App bar with "examprep" logo + back arrow
BREADCRUMB CONTEXT: "Dashboard / Subjects / Topics / Chapter {N} / Practice" (or "Dashboard / Bookmarks / Practice" for bookmarked mode)

HEADER:
- Title: "Practice Questions" (or "Practice Questions - Chapter {N}")
- Subtitle: "Shortcuts: 1-4 select option, Enter submit, N next." (omit keyboard shortcuts text on mobile, replace with brief instruction)
- Difficulty filter pills: "All", "easy", "medium", "hard"

FREE TIER BANNER (shown when applicable):
- Accent-tinted card: "Free tier remaining in this subject: {N} question(s). Upgrade for unlimited access."
- "Subscribe to access" outline button

QUESTION VIEW:
- Progress indicator: "Question {current} of {total}" + difficulty badge (easy/medium/hard) + "Bookmark"/"Bookmarked" toggle pill
- Linear progress bar (accent/orange colour)
- Question card: large text showing question, optional image below
- MCQ options: 4 large tappable cards, each showing option label (A/B/C/D) + option text
  - Default: bordered card
  - Selected: accent-highlighted border + tinted background
  - After submit -- correct: green-accent highlight
  - After submit -- wrong selected: red highlight
  - After submit -- correct answer: accent highlight (even if not selected)
- Action buttons: "Submit answer" (primary, disabled until option selected) + "Next question" (outline, disabled until answered)

FEEDBACK CARD (after submit):
- Green-accent border if correct: "Correct answer"
- Red border if incorrect: "Incorrect answer"
- Details: "Time spent: {N}s | Correct option: {label}"
- Explanation text if available

SESSION SUMMARY (after all questions answered):
- Heading: "Session Summary"
- "You answered {score} out of {total} correctly."
- 3 stat cards: "Score" ({score}/{total}), "Accuracy" ({percentage}%), "Time Spent" ({seconds}s)
- "Review incorrect answers" section: list of wrong answers showing question text, "Your answer: {label} | Correct: {label}", explanation
- If all correct: "Great work. You got every question correct."
- "Continue practicing" primary button + "Return to topics" outline button

STATES:
- Loading: skeleton blocks
- Content locked (free tier exhausted): "Subscribe to access" / "You have reached the free question limit for this subject. Upgrade to continue practicing." + "Subscribe to access" + "Back to topics"
- No questions: "No questions available for this filter" with "Use all difficulties" button
- Error: red card + Retry
```

### Screen 9: Mock Exam List

```
Design the Mock Exam screens.

MOCK EXAM SUBJECTS SCREEN:
- Grid of subject cards with exam counts
- Tapping navigates to grade selection for that subject

MOCK EXAM GRADES SCREEN:
- Grade cards for the selected subject
- Tapping navigates to exam list filtered by subject + grade

MOCK EXAM LIST SCREEN:
- Exam cards grouped by subject showing: title, latest attempt info, "Start" button
- Tapping "Start" shows confirmation modal (bottom sheet on mobile): "Start this exam? You will have {duration} minutes to complete {questionCount} questions." + "Start" / "Cancel"

STATES: Loading, empty, error (same patterns)
```

### Screen 10: Mock Exam Attempt

```
Design the Mock Exam Attempt screen (timed exam).

TOP BAR:
- Timer display (prominently shown, countdown format)
- "Submit" button in top-right

QUESTION NAVIGATOR:
- Scrollable row or grid of numbered circles (1, 2, 3, ...)
- States: unanswered (default), answered (filled), flagged (marked border), current (accent highlight)

QUESTION AREA:
- Question text in card
- MCQ options as tappable cards (A, B, C, D)
- "Flag" toggle button to mark question for review
- "Previous" / "Next" navigation buttons

SUBMIT FLOW:
- Bottom sheet confirmation: "Submit this exam? You cannot change answers after submitting."
- "Submit" / "Cancel" buttons
- Saves answers to localStorage during attempt for resilience

STATES: Loading, timer warning (last 5 minutes), submitted
```

### Screen 11: Mock Exam Results

```
Design the Mock Exam Results screen.

HEADER: "Exam Results"

STATS ROW:
- Score: {score}/{total}
- Time: {timeSpent}
- Incorrect: {count}
- Benchmark (if available)

REVIEW LIST:
- Filterable list of questions
- Each item shows: question number, question text snippet, your answer vs correct answer, correct/incorrect indicator
- Tapping expands to show explanation

ACTIONS: "Back to Mock Exams" button
```

### Screen 12: Bookmarks

```
Design the Bookmarks screen.

TOP: App bar with "Bookmarks" title
BREADCRUMB CONTEXT: "Dashboard / Bookmarks"

HEADER:
- Title: "Bookmarks"
- Subtitle: "Review saved questions and launch a bookmarked-only practice session."
- "Practice Bookmarked" primary button (accent colour, top-right or below subtitle)

FILTERS:
- Filter pills: "All subjects", "All grades", "{N} saved"
- Subject dropdown: "All subjects"
- Grade dropdown: "All grades"

BOOKMARK LIST:
- Cards showing bookmarked questions with subject/grade context
- Remove button (with toast "Bookmark removed.")

EMPTY STATE:
- "No bookmarks found"
- "Save questions during practice to review them here."
- "Go to subjects" button
```

### Screen 13: Progress

```
Design the Progress Dashboard screen.

TOP: App bar with "Progress" title
BREADCRUMB CONTEXT: "Dashboard / Progress"

HEADER:
- Title: "Progress Dashboard"
- Subtitle: "Track consistency, subject performance, and weak areas."

STAT CARDS (2-column):
- "TOTAL QUESTIONS" / {number} / "All attempts recorded"
- "CURRENT STREAK" / {number} days / "Consecutive active days"

OVERALL ACCURACY SECTION:
- Toggle: "Accuracy" / "Coverage"
- Donut/radial chart showing percentage
- Center text: "{percentage}% / {correct}/{total} correct"

DAILY GOAL SECTION:
- Toggle: "Today" / "Recent Pace"
- Concentric ring chart showing progress toward 20-attempt daily target
- "{completed} of 20 attempts"
- "LAST 7 DAYS" stats: Completed count + "% of goal", Remaining count + "% left"
- Day distribution bar chart

STRENGTHS & WEAKNESSES SECTION:
- Radar/spider chart showing Accuracy, Coverage, Practice Depth across subjects
- Summary cards: "STRONGEST" / "NEEDS FOCUS" / "BEST COVERAGE" with subject names and percentages

WEAK TOPICS SECTION:
- "Weak Topics" heading + "Practice" link
- List of weak topics: topic name, subject + grade, "adjusted risk score" percentage

PER-SUBJECT PROGRESS SECTION:
- "Per-Subject Progress" heading
- Cards for each subject: name, coverage bar, "{coverage}% coverage - {accuracy}% accuracy", "View breakdown" link
- Tapping "View breakdown" opens a modal/bottom sheet with topic-level details

GRADE-LEVEL BREAKDOWN SECTION:
- Cards for each grade: "Grade {N}", attempts count, accuracy, "View breakdown" link

STATES: Loading (special splash with spinning rings + rotating messages like "Crunching your numbers...", "Mapping your strengths...", "Almost there..."), Error with Retry
```

### Screen 14: Leaderboard

```
Design the Leaderboard screen.

TOP: App bar with "Leaderboard" title
BREADCRUMB CONTEXT: "Dashboard / Leaderboard"

HEADER:
- Title: "Leaderboard"
- Subtitle: "Compare your score with other students by period and subject."

FILTERS:
- Period pills: "Weekly" (active by default, accent-filled), "Monthly", "All-Time"
- Subject dropdown: "All subjects"

YOUR RANK CARD:
- "Your Rank" heading
- User name, rank badge (accent pill showing "Rank {N}"), points display

RANKINGS LIST:
- Numbered list of students
- Top 3 with medal-style badges (gold/silver/bronze circles)
- Each row: rank number, name, "{points} pts - {accuracy}% accuracy", points on right
- Expandable rows: tapping shows detail mini-cards with additional stats

STATES: Loading (skeletons), empty ("No leaderboard data yet")
```

### Screen 15: Subscribe

```
Design the Subscribe screen.

HEADER:
- Title: subscription plan selection
- Free vs Premium comparison if applicable

PLAN CARDS:
- "MONTHLY" / "QUARTERLY" / "YEARLY" plan cards
- Each shows price, billing period, features included
- Selected state with accent border

PAYMENT METHODS:
- Telebirr tile
- CBE Birr tile
- Bank Transfer tile
- Selected state with accent highlight

PAYMENT FLOW:
- "Initiate Payment" button
- For Telebirr/CBE Birr: redirect to payment provider
- For bank transfer: display bank details card (bank name, account number, account name, reference)
- Polling + toast notifications for payment status

STATES: Loading, payment pending, success, error
```

### Screen 16: Account Subscription

```
Design the Account Subscription screen.

CONTENT:
- Current plan label + status badge (active/expired/pending)
- Expiry date
- Payment history list (or empty state: "No payment history yet")
```

### Screen 17: Privacy & Data

```
Design the Privacy & Data screen.

CONTENT:
- Consent toggles (switch components):
  - Analytics consent
  - Personalisation consent
  - Marketing consent
- Delete Account section:
  - Warning text
  - Confirmation input or modal
  - "Delete my account" danger button (red)

STATES: Loading, saving (toggle disabled briefly), confirmation modal for delete
```

---

## SECTION E -- DO-NOT-CHANGE RULES

```
STRICT RULES -- Do not violate any of these when designing the mobile app:

BRAND:
- Do NOT change the app name from "examprep"
- Do NOT change the logo mark (white "e" on accent gradient square)
- Do NOT change the golden/warm accent colour palette to blue, green, purple, or any other hue
- Do NOT change the dark mode colour scheme from navy-slate to pure black or grey
- Do NOT change the light mode from warm cream to cool white or grey

TERMINOLOGY -- Do NOT rename any of these:
- "subjects" (not "courses" or "classes")
- "chapters" / "topics" (not "lessons" or "modules")
- "practice" (not "quiz" or "test" for the practice flow)
- "mock exams" (not "practice tests" or "sample exams")
- "attempts" (not "tries" or "submissions")
- "coverage" (not "completion" or "progress percentage")
- "accuracy" (not "score" -- score is used only in session summary/mock results)
- "streak" (not "daily login" or "chain")
- "bookmarks" (not "favourites" or "saved items")
- "weak topics" (not "areas for improvement" or "focus areas")
- "subscribe" / "premium" / "free tier" (not "pro" or "paid plan")
- "Telebirr" / "CBE Birr" / "Bank Transfer" (exact payment method names)
- Grade levels: "Grade 9", "Grade 10", "Grade 11", "Grade 12"

FIELD LABELS -- Keep these exact labels:
- "Email", "Password", "Full Name", "Phone Number", "Confirm Password"
- "Remember me", "Forgot password?"
- "Sign in", "Create account", "Sign up free"
- "Submit answer", "Next question", "Continue practicing"
- "Bookmark" / "Bookmarked"
- "Practice Bookmarked"
- "Subscribe to access"

COPY -- Preserve these exact messages:
- "Welcome back" (login heading)
- "Sign in to continue your preparation" (login subheading)
- "Create your account" (register heading)
- "Start preparing for your exams today" (register subheading)
- "Welcome back, {name}" (dashboard heading)
- "No recent activity yet" (dashboard empty state)
- "Start by choosing a subject to build your learning path."
- "Choose a Subject" (subjects page heading)
- "Select a grade first, then pick a subject to choose your chapter."
- "Practice Questions" (practice page heading)
- "Session Summary" (practice completion heading)
- "No bookmarks found" / "Save questions during practice to review them here."
- "Progress Dashboard" / "Track consistency, subject performance, and weak areas."
- "Leaderboard" / "Compare your score with other students by period and subject."

LOGIC -- Do NOT change:
- The practice flow (one question at a time, submit then see feedback, then next)
- The MCQ option format (A, B, C, D labels)
- The session summary structure (score, accuracy, time, incorrect review)
- The mock exam timer-based flow
- The subscription model (free tier + paid plans)
- The payment methods (Telebirr, CBE Birr, Bank Transfer)
- The leaderboard periods (Weekly, Monthly, All-Time)
- The grade filter system (Grade 9-12)
- The difficulty filter (All, Easy, Medium, Hard)

FEATURES -- Do NOT add:
- Social login (Google, Facebook, Apple) unless the backend adds it
- Chat or messaging
- Push notifications UI (unless specifically requested)
- Gamification elements (points, badges, levels) beyond what exists (streak, leaderboard)
- Onboarding tutorial screens
- Dark/light mode toggle in a prominent location (match web app's behaviour)
- Profile photo upload (not in the web app)
- Any feature not present in the web app
```

---

## SECTION F -- DEVELOPER HANDOFF NOTES

```
DEVELOPER HANDOFF NOTES
========================

These notes are for the developer who will connect the Lovable-generated mobile frontend to the existing ExamPrep Ethiopia backend.

BACKEND:
- Technology: NestJS with Prisma ORM on PostgreSQL + Redis
- Base URL: configurable via environment variable (e.g. NEXT_PUBLIC_API_URL)
- All API routes are prefixed with /api/v1
- Swagger docs available at /api/docs (non-production)

AUTHENTICATION:
- Custom email/password JWT auth (not OAuth/social)
- POST /api/v1/auth/login returns { user, accessToken, refreshToken }
- accessToken: short-lived (15 min), sent as Bearer token in Authorization header
- refreshToken: long-lived (7 days), used to get new accessToken via POST /api/v1/auth/refresh
- On 401, the client should attempt token refresh; if refresh fails, redirect to login
- Tokens stored in client storage (AsyncStorage on mobile)
- GET /api/v1/auth/me returns the current user object

HTTP CLIENT:
- Use axios (or equivalent) with interceptors for:
  - Attaching Bearer token to all requests
  - Intercepting 401 to attempt refresh
  - Redirecting to login on refresh failure
- The web app's implementation is in web/src/lib/apiClient.ts -- replicate this pattern

DATA FETCHING:
- The web app uses TanStack React Query for all data fetching
- Query keys are centralised in web/src/hooks/queryKeys.ts
- Replicate the same caching, invalidation, and refetch patterns

STATE MANAGEMENT:
- Auth state: Zustand store (web/src/stores/authStore.ts)
- Server data: React Query
- Local persistence: lastLearningContext stored in localStorage (use AsyncStorage on mobile)

API ENDPOINTS (complete list):

Auth:
  POST   /auth/register          { name, email, phone, password }
  POST   /auth/login             { email, password }
  POST   /auth/logout
  POST   /auth/refresh           { refreshToken }
  GET    /auth/me
  POST   /auth/forgot-password   { email }
  POST   /auth/reset-password    { token, password }

Content:
  GET    /streams
  GET    /subjects
  GET    /subjects/:id           (includes topics array)
  GET    /grades
  GET    /questions              ?topicId=&subjectId=&gradeId=&difficulty=&limit=&offset=
  GET    /questions/:id
  POST   /questions/:id/attempt  { selectedOptionId, timeSpentSeconds }

Bookmarks:
  GET    /bookmarks              ?subjectId=&gradeId=
  POST   /bookmarks              { questionId }
  DELETE /bookmarks/:id

User Stats:
  GET    /users/me/stats
  GET    /users/me/stats/subjects
  GET    /users/me/stats/weak-topics
  GET    /users/me/stats/trend
  GET    /users/me/stats/grades
  GET    /users/me/stats/grades/:gradeId
  GET    /users/me/stats/subjects/:subjectId

Leaderboard:
  GET    /leaderboard            ?period=WEEKLY|MONTHLY|ALL_TIME&subjectId=&limit=

Mock Exams:
  GET    /mock-exams
  GET    /mock-exams/attempts/history
  POST   /mock-exams/:id/start
  POST   /mock-exams/attempts/:id/submit   { answers: { questionId: optionId } }
  GET    /mock-exams/attempts/:attemptId/review

Subscriptions:
  GET    /subscriptions/plans
  GET    /subscriptions/status
  GET    /subscriptions/free-tier/:subjectId
  POST   /payments/initiate      { plan, paymentMethod }
  GET    /payments/history

Account:
  GET    /users/me/consent
  PUT    /users/me/consent       { analytics, personalisation, marketing }
  DELETE /users/me

Analytics (optional):
  POST   /analytics/sessions/start
  POST   /analytics/sessions/:id/end
  POST   /analytics/events

SHARED TYPES:
- The monorepo has a shared package at packages/shared/src/types/ with TypeScript interfaces for:
  User, RegisterRequest, LoginRequest, AuthResponse, UserStats, SubjectStats,
  StreamInfo, Subject, Grade, Topic, Question, QuestionOption, QuestionAttempt,
  SubmitAnswerRequest, SubmitAnswerResponse, MockExam, MockExamAttempt,
  StartExamResponse, SubmitExamRequest, ExamResultResponse, Subscription,
  InitiateSubscriptionRequest, InitiateSubscriptionResponse, BankDetails,
  Payment, LeaderboardEntry, LeaderboardResponse
- Reuse these types in the mobile app (import from shared package or duplicate)

ENUMS:
- UserRole: STUDENT, ADMIN
- Stream: NATURAL, SOCIAL
- GradeLevel: 9, 10, 11, 12
- Difficulty: EASY, MEDIUM, HARD
- QuestionStatus: DRAFT, PUBLISHED
- SubscriptionPlan: MONTHLY, QUARTERLY, YEARLY
- SubscriptionStatus: ACTIVE, EXPIRED, PENDING
- PaymentMethod: TELEBIRR, CBE_BIRR, BANK_TRANSFER
- PaymentStatus: PENDING, VERIFIED, REJECTED
- LeaderboardPeriod: WEEKLY, MONTHLY, ALL_TIME

MOBILE-SPECIFIC CONSIDERATIONS:
- Use AsyncStorage instead of localStorage for token storage and lastLearningContext
- Deep linking: the web app uses Next.js file-based routing; map routes to React Navigation screens
- The web app rewrites /api/v1/* to the backend via Next.js config; on mobile, call the backend URL directly
- Image hosting: Next/Image references *.supabase.co and res.cloudinary.com hostnames
- i18n: the web app has an I18nProvider with translation keys (e.g. t('dashboard.welcomeBack')); replicate the same i18n setup or use the English defaults
- Analytics: the web app posts events to /analytics/events; implement the same tracking on mobile

TESTING:
- The backend has no CORS restrictions in dev; configure CORS for the mobile app's origin in production
- The web dev server runs on port 3000, backend on port 3001
```

---

## End of Prompt Package

Each section above can be pasted into Lovable individually or combined. Start with **Section A (Master Prompt)**, then feed **Section B (Design System)** and **Section C (Mobile Adaptation Rules)** as context. Then iterate through **Section D (Screen Prompts)** one screen at a time. Keep **Section E (Do-Not-Change Rules)** active throughout to prevent drift.
