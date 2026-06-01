# Weekly Project Report

**Reporting Periods:** April 20–24, 2026 & April 27 – May 1, 2026
**Prepared by:** Fusco
**Date:** May 4, 2026

## Overview
This report covers two reporting weeks across two active projects: **PalmTechnIQ v2** (EdTech platform) and **ISCE Mail** (internal bulk email system). The April 20–24 week was a planned low-activity period with no commits recorded on either project. The bulk of development activity was concentrated in the April 27 – May 1 week, which saw significant feature work across both projects — totalling **4 commits / 35 files / 1,993 additions** on PalmTechnIQ and **11 commits / 90 files / 9,377 additions** on ISCE Mail.

---

# Week 1: April 20 – 24, 2026

## Project: PalmTechnIQ v2

1. **Project Name:** PalmTechnIQ v2 — EdTech Learning Management Platform
2. **Objective / Scope:** A comprehensive Next.js-based EdTech platform for teaching courses, mentorship, and professional program enrollment targeting the Nigerian market, with Paystack payments, AI recommendations, and multi-role support (Student, Tutor, Admin, Mentor, Tester, Superior).
3. **Current Phase:** Development
4. **Project Features (Features worked on this week):**
    * No commits recorded. Week used for planning, design review, and preparation for the features shipped the following week.
5. **What Has Been Completed So Far:** *(see previous report — April 9–17, 2026)*
6. **What Is Currently in Progress:** Planning and scoping the mailing system integration API, blog SEO improvements, and student achievements feature.
7. **What Is Left to Be Done:** Integration API for external mailing sync, blog RSS feed, student achievements page, documentation updates.
8. **Any Blockers or Dependencies:** None.
9. **Expected Timeline to Next Milestone:** April 28 — mailing integration API and blog improvements.

**Relevant Links:**
* Live URL: https://palmtechniq.com
* Repository: *(internal)*

---

## Project: ISCE Mail

1. **Project Name:** ISCE Mail — Internal Bulk Email Campaign System
2. **Objective / Scope:** An internal Next.js tool for composing and sending branded bulk email campaigns to ISCE and PalmTechnIQ audiences via Resend, supporting multiple email types (announcements, events, promotions, newsletters, surveys, cohort welcome, course promo, and more).
3. **Current Phase:** Development
4. **Project Features (Features worked on this week):**
    * No commits recorded. Week used for planning new template types and the background job infrastructure.
5. **What Has Been Completed So Far:** *(see initial setup)* Basic email forms, shared Resend integration, initial templates for announcement, events, newsletter, holiday, promotion, survey, welcome, appreciation.
6. **What Is Currently in Progress:** New email template types (course-promo, cohort-welcome, curriculum), background job system for bulk sends, Resend webhook integration.
7. **What Is Left to Be Done:** Job monitoring dashboard, webhook delivery tracking, promotion template improvements, full per-type send API routes.
8. **Any Blockers or Dependencies:** None.
9. **Expected Timeline to Next Milestone:** April 28 — bulk email job system and new template types shipped.

**Relevant Links:**
* Live URL: *(internal)*
* Repository: *(internal)*

---

# Week 2: April 27 – May 1, 2026

## Project: PalmTechnIQ v2

1. **Project Name:** PalmTechnIQ v2 — EdTech Learning Management Platform
2. **Objective / Scope:** Same as above.
3. **Current Phase:** Development
4. **Project Features (Features worked on this week):**

    ### Feature 1: Mailing System Integration API *(April 28)*
    Built a secure server-to-server API enabling the ISCE Mail system to sync PalmTechnIQ user data for targeted email campaigns.

    **What was implemented:**
    * **Mailing Sync API Endpoint** (`app/api/integrations/mailing/users/route.ts` — 179 lines): Accepts `limit`, `cursor` (for cursor-based pagination), and `since` (ISO date for delta/incremental syncs). Supports API key authentication via `x-integration-key`, `x-api-key`, or Bearer token. Rate-limited to 120 requests per 60 seconds per client. Returns paginated user records with `updatedAt`/`createdAt` timestamps.
    * **Integration Auth Module** (`lib/integration-auth.ts` — 78 lines): Timing-safe API key comparison using `crypto.timingSafeEqual` to prevent timing attacks. Supports primary key (`MAILING_SYNC_API_KEY`) and a rotated previous key (`MAILING_SYNC_API_KEY_PREVIOUS`) for zero-downtime key rotation. IP allowlist parsing from environment variables. Extracts client IP from `x-forwarded-for` and `x-real-ip` headers.
    * **Key Generation Script** (`scripts/generate-integration-keys.js`): Utility to generate secure 256-bit hex integration keys with `.env` setup instructions and key rotation guidance.
    * **IP Allowlist Removal** (`e98587a`): Later in the week, the IP allowlist restriction was removed from integration auth to improve flexibility across deployment environments.
    * **API Documentation** (`docs/MAILING-USERS-SYNC-API.md` — 72 lines): Complete developer documentation covering authentication methods, pagination strategy, delta sync usage, response schema, rate limiting, and key rotation procedures.

    ---

    ### Feature 2: Blog System Improvements & SEO Enhancements *(April 28)*
    Significantly improved the blog with new content features, additional SEO signals, and build stability fixes.

    **What was implemented:**
    * **RSS Feed** (`app/rss.xml/route.ts` — 88 lines): Standard RSS 2.0 feed generator fetching up to 100 posts from Sanity. Includes post metadata (author, category, publication date, last modified date), XML entity escaping, and custom canonical URLs from SEO data.
    * **Google News Sitemap** (`app/news-sitemap.xml/route.ts` — 70 lines): Dedicated news sitemap filtering posts published within the last 2 days and formatting them with publication metadata compliant with Google News sitemap schema.
    * **Sitemap & Robots Updates**: Updated `app/sitemap.ts` (+19 lines) and `app/robots.ts` (+6 lines) to reference new feed endpoints and news sitemap.
    * **Blog Detail Page Enhancements** (`app/(root)/blog/[slug]/page.tsx` — 210 lines added): Improved static site generation with `generateStaticParams`, richer OG metadata with keywords, article-specific publish/modified dates, author information, and canonical URL support. CI/CD pipeline stability fixes reducing total lines by cleanup.
    * **Blog Listing Improvements** (`app/(root)/blog/page.tsx` — 59 lines added): Better data fetching, filter state improvements, and additional post metadata display.
    * **Sanity Schema & Query Enhancements** (`sanity/schemas/post.ts` +84 lines, `lib/sanity-queries.ts` +46 lines): Expanded Sanity post schema with SEO fields (meta title, meta description, canonical URL, keywords) and added corresponding GROQ query support.

    ---

    ### Feature 3: Student Achievements Page *(April 28)*
    Added a gamified achievements system to the student dashboard.

    **What was implemented:**
    * **Achievements Component** (`components/pages/student/achievements/achievements-comp.tsx` — 277 lines): Displays gamified student achievements with filtering by type (lessons, quizzes, courses, skills mastery), rarity levels (Common/Uncommon/Rare/Epic), and search. Summary cards show totals: earned badges, courses completed, and current streak. Animated with Framer Motion.
    * **Achievements Page** (`app/(root)/student/achievements/page.tsx` — 19 lines): Server component with forced dynamic rendering that fetches student achievement data and passes it to the achievements component.
    * **Student Progress Data** (`data/studentprogress.ts` — 94 lines): Server-side data fetcher that aggregates enrollment progress, auto-creates missing Student profiles, and computes achievement summaries (total earned, courses completed, streaks).

    ---

    ### Feature 4: Student Dashboard & Progress Improvements *(April 28)*
    Enhanced the student dashboard with richer progress data and display.

    **What was implemented:**
    * **Student Dashboard** (`components/pages/student/studentdash.tsx` — 146 lines added): Updated dashboard cards and stat aggregations with improved layout.
    * **Progress Component** (`components/pages/student/progress/progress-comp.tsx` — 17 lines): Improvements to progress data presentation.
    * **Student Data Queries** (`data/studentdata.ts` +8, `data/studentprogress.ts` +94 lines): Extended data queries for richer progress and achievement metrics.

    ---

    ### Feature 5: Auth & Platform Documentation Updates *(April 28)*
    Improved auth flows and expanded internal documentation.

    **What was implemented:**
    * **Auth Improvements** (`actions/auth.ts` — 56 lines added): Enhanced authentication handling including `mustChangePassword` redirect logic, improved error responses, and analytics event tracking for sign-in flows.
    * **Documentation Expansion** (`lib/docs/content.ts` — 167 lines added, `docs/changes-log.md` — 79 lines, `docs/process.md` — 23 lines, `docs/SEO-IMPLEMENTATION.md` +40 lines): Comprehensive expansion of platform documentation covering all new features, SEO changes, change log, and development process notes.
    * **CI/CD Fix**: Resolved pipeline issues related to blog build and environment variable handling.

5. **What Has Been Completed So Far:**
    * **Previously completed**: Authentication, course CRUD, enrollment system, Paystack payments, shopping cart, group buying, mentorship system, professional programs with installments, AI features, student/tutor/admin dashboards, notifications, reviews/discussions, quiz/project/assignment system, wallet & withdrawals, analytics tracking, promotion system, complete SEO, tutor referral system, Sanity CMS blog, certificate verification, platform documentation, Superior/Tester roles, analytics dashboard, student verification page.
    * **This week**: Mailing system integration API (with secure auth and pagination), blog RSS feed, Google News sitemap, blog SEO enhancements, Sanity schema improvements, student achievements page, student dashboard improvements, auth flow enhancements, and documentation expansion.

6. **What Is Currently in Progress:**
    * ISCE Mail integration consuming the new mailing sync API
    * Further student gamification improvements (streak tracking, leaderboards)

7. **What Is Left to Be Done:**
    * Blog commenting system
    * Certificate PDF download/export
    * Analytics event coverage for mentorship and program enrollment flows
    * Tester feedback collection pipeline
    * End-to-end QA pass on achievements, integration API, and blog RSS

8. **Any Blockers or Dependencies:**
    * ISCE Mail integration depends on PalmTechnIQ mailing sync API — delivered this week, unblocking ISCE Mail.

9. **Expected Timeline to Next Milestone:** May 8, 2026 — student gamification enhancements and continued analytics coverage.

**Relevant Links:**
* Live URL: https://palmtechniq.com
* Repository: *(internal)*

---

## Project: ISCE Mail

1. **Project Name:** ISCE Mail — Internal Bulk Email Campaign System
2. **Objective / Scope:** An internal Next.js tool for composing and sending branded bulk email campaigns to ISCE and PalmTechnIQ audiences via Resend, supporting multiple email campaign types with delivery tracking, job management, and PalmTechnIQ user sync.
3. **Current Phase:** Development — **Major Feature Release**
4. **Project Features (Features worked on this week):**

    ### Feature 1: Background Job System for Bulk Email Sends *(April 28–29)*
    Built a complete fire-and-forget async job infrastructure to handle large bulk email campaigns without HTTP timeouts.

    **What was implemented:**
    * **Job Store** (`src/lib/jobs.ts` — 62 lines): In-memory singleton job store with full CRUD: `createJob()`, `updateJob()`, `getJob()`, `listJobs()`. Tracks job lifecycle: `pending → running → done/failed` with sent/failed recipient counts, error messages, and completion timestamps. Stores up to 100 jobs (newest first, cleared on server restart).
    * **Job API Endpoints**:
      - `GET /api/jobs` (`src/app/api/jobs/route.ts` — 8 lines): List all jobs.
      - `GET /api/jobs/[id]` (`src/app/api/jobs/[id]/route.ts` — 15 lines): Fetch single job by ID or return 404.
      - `POST /api/jobs/[id]/run` (`src/app/api/jobs/[id]/run/route.ts` — 67 lines): Execute a pending job — validates job existence and state, transitions status, tracks sent/failed counts.
    * **Shared Send Utilities** (`src/lib/mail-action/shared.ts` — 110 lines): Core utilities including `IBasis` brand type (ISCE/PalmTechniq), `BatchRecipient` interface, per-brand Resend client instances, `getSenderAddress()` for brand-specific from addresses, `interpolate()` for personalizing templates with `{{firstName}}`/`{{name}}`/`{{email}}` tokens, and `sendBatch()` for chunked Resend batch sends (100 recipients per chunk).
    * **Send History** (`src/lib/send-history.ts` — 39 lines): In-memory send history singleton storing up to 200 entries (newest first). Logs campaign type, brand, subject, recipient count, and timestamp. Exposed via `logSend()`, `getSendHistory()`, `clearSendHistory()`.
    * **Polling Fix** (`888de48`): Fixed infinite polling issue in multiple form pages; increased polling duration to 60 seconds.
    * **Webhook Integration** (`08f539d`): Added fire-and-forget approach for large sends to prevent gateway timeouts.

    ---

    ### Feature 2: Resend Webhook Integration & Delivery Event Tracking *(April 28–29)*
    Implemented Resend webhook handling to track email delivery events in real time.

    **What was implemented:**
    * **Webhook Handler** (`src/app/api/webhooks/resend/route.ts` — 72 lines): Receives and verifies Resend delivery events using Svix HMAC SHA256 signature validation with ±5-minute timestamp window to prevent replay attacks. Parses and stores events into the email events store.
    * **Email Events Store** (`src/lib/email-events.ts` — 41 lines): In-memory store (max 500 events, newest first) for Resend webhook events: `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.opened`, `email.clicked`. Exposed via `pushEmailEvent()`, `getEmailEvents()`, `clearEmailEvents()`.
    * **Email Events API** (`src/app/api/email-events/route.ts` — 14 lines): GET endpoint returning stored delivery events.

    ---

    ### Feature 3: Send History & Monitoring Dashboard *(April 28–29)*
    Built a comprehensive monitoring UI for tracking email campaigns, jobs, and delivery events.

    **What was implemented:**
    * **History Dashboard** (`src/app/history/page.tsx` — 346 lines): Three-tab monitoring dashboard: **Send History** (campaign log with type, brand, subject, recipients, timestamp), **Active Jobs** (in-progress/completed send jobs with status badges: pending/running/done/failed and progress metrics), and **Delivery Events** (Resend webhook events with delivery status badges: delivered/bounced/complained/opened/clicked). Manual refresh button and auto-poll for running jobs.
    * **Send History API** (`src/app/api/send-history/route.ts` — 11 lines): GET endpoint returning all logged campaign sends.

    ---

    ### Feature 4: PalmTechnIQ User Sync Integration *(April 28)*
    Connected ISCE Mail to the PalmTechnIQ mailing sync API to pull real user recipient lists.

    **What was implemented:**
    * **PalmTechnIQ Users Library** (`src/lib/palmtechniq-users.ts` — 132 lines): Fetches synced user recipients from PalmTechnIQ's integration API. In-memory cache with 5-minute TTL for full syncs, bypassed for delta syncs via `since` parameter. Converts recipients to CSV format. Supports manual cache invalidation. Configured via `PALMTECHNIQ_SYNC_BASE_URL` and `PALMTECHNIQ_SYNC_API_KEY` environment variables.
    * **Recipients Proxy Endpoint** (`src/app/api/recipients/palmtechniq/route.ts` — 30 lines): GET endpoint proxying to PalmTechnIQ's API. Supports `?refresh=1` to bypass cache and `?since=<ISO>` for delta syncs. Returns recipients array, CSV string, total count, cache status, and sync timestamp.

    ---

    ### Feature 5: New Email Template Types *(April 28)*
    Added 4 new email campaign types for both ISCE and PalmTechnIQ brands.

    **What was implemented:**
    * **Course Promotion Template** (`emails/templates/palmtechniq/course-promo.tsx` — 223 lines): Rich HTML email with course title, original vs. discount pricing (auto-calculates percentage off), enrollment deadline, banner image, custom HTML message body, and CTA button. Dark PalmTechnIQ header.
    * **Cohort Welcome Template** (ISCE + PalmTechnIQ variants — 169 & 203 lines respectively): Welcome emails for new cohort enrollees with cohort name, start date, mentor name, community link, banner image, and custom message. Brand-specific styling.
    * **Curriculum Template** (ISCE + PalmTechnIQ variants — 134 & 166 lines respectively): Course curriculum overview email with structured content blocks.
    * **Branding Assets**: Added PalmTechnIQ logo PNG (`public/static/PalmTechnIQ.png`) for use across PalmTechnIQ-branded templates.
    * **Per-Type Mail Actions** (`src/lib/mail-action/`): Created dedicated send logic for cohort-welcome, course-promo, and curriculum with proper template rendering and Resend integration.

    ---

    ### Feature 6: Complete Per-Type Send API Routes *(April 28–29)*
    Created individual send API routes for all email campaign types.

    **What was implemented:**
    * **9 New Send Endpoints** (`src/app/api/send/`): Dedicated POST routes for: `announcement`, `appreciation`, `cohort-welcome`, `course-promo`, `curriculum`, `event`, `holiday`, `newsletter`, `survey`, and `welcome`. Each validates recipients and subject, calls `sendBulkEmailTracked()`, logs to send history, and returns sent/failed counts.
    * **Promotion Route Fix** (`2e9a29e`): Fixed broken promotion route and send endpoint.

    ---

    ### Feature 7: Form Improvements & UX Components *(April 28–29)*
    Overhauled all email campaign forms with new shared UX components.

    **What was implemented:**
    * **Confirm Send Dialog** (`src/components/shared/confirm-send-dialog.tsx` — 81 lines): Alert dialog showing recipient count, subject, and brand before sending. Warning that the action is irreversible. Confirm/cancel buttons with loading state.
    * **Image Uploader Component** (`src/components/shared/image-uploader.tsx` — 148 lines): Drag-and-drop image uploader with file upload and direct URL tabs, calls `/api/upload`, shows loading/error states and a clear button.
    * **Draft Autosave Hook** (`src/hooks/useDraftAutosave.ts` — 65 lines): Saves form state to localStorage with 600ms debounce. Exports `restoreDraft()` and `discardDraft()`. Prevents save on initial mount. Gracefully handles localStorage errors.
    * **Form Refactors**: Updated 9 mail form pages (announcement, appreciation, cohort-welcome, curriculum, event, holiday, newsletter, survey, welcome) to use the new shared confirm dialog, image uploader, and draft autosave hook.

    ---

    ### Feature 8: Template Fixes & Polish *(April 29 – May 1)*
    Multiple rounds of template refinement for visual consistency.

    **What was implemented:**
    * **Course Promo Template** (`71ad82b`, `b14b9f3`): Major visual overhaul of `palmtechniq/course-promo.tsx` (456 lines, heavily restructured) and `palmtechniq/promotion.tsx` (264 lines, restructured) for better responsive display, pricing layout, and brand consistency.
    * **Holiday Templates** (`7b36d9f`, `02e0a72`): Significant updates to both ISCE and PalmTechnIQ holiday templates (236 and 267 lines respectively) for improved visual design. Final fixes to layout issues.
    * **README Corrections** (`8f88f81`, `96c8430`): Fixed grammar and typos in project README.

5. **What Has Been Completed So Far:**
    * Initial email system setup with basic forms and Resend integration
    * **This week**: Full background job system for async bulk sends, Resend webhook integration with delivery event tracking, send history and monitoring dashboard, PalmTechnIQ user sync integration, 4 new email template types (course promo, cohort welcome, curriculum + ISCE variants), 9 per-type send API routes, confirm send dialog, image uploader, draft autosave, complete form overhaul across all campaign types, and template polish for course promo, promotion, and holiday.

6. **What Is Currently in Progress:**
    * Additional template types (e.g., re-engagement, payment reminders)
    * Persistent job/history storage (replacing in-memory with a database or file store)

7. **What Is Left to Be Done:**
    * Persistent storage for jobs and send history across server restarts
    * ISCE-branded course promo and curriculum templates
    * Scheduled/delayed sends
    * Recipient list management UI (import, filter, deduplicate)
    * Campaign analytics reporting (open rates, click rates from webhook events)
    * Authentication/access control for the internal tool

8. **Any Blockers or Dependencies:**
    * PalmTechnIQ mailing sync API — delivered this week by the PalmTechnIQ team, fully unblocked.

9. **Expected Timeline to Next Milestone:** May 8, 2026 — persistent job storage, additional template types, and campaign analytics reporting.

**Relevant Links:**
* Live URL: *(internal)*
* Repository: *(internal)*

---

## General Blockers / Cross-Project Dependencies

* PalmTechnIQ mailing sync API integration with ISCE Mail was the primary cross-project dependency this cycle — **delivered and integrated in week 2**.
* No remaining cross-project blockers identified.

## Next Steps / Overall Priorities

1. **PalmTechnIQ**: Student gamification enhancements (streak tracking, points leaderboard)
2. **ISCE Mail**: Migrate in-memory job/history storage to persistent database layer
3. **PalmTechnIQ**: Analytics event coverage for mentorship and program enrollment flows
4. **ISCE Mail**: Campaign analytics dashboard (open rates, click rates, bounce rates from webhook data)
5. **Both**: Comprehensive QA pass on all features shipped in the April 27 – May 1 sprint
6. **PalmTechnIQ**: Blog commenting system and certificate PDF export
7. **ISCE Mail**: Recipient list management UI (import, deduplication, filtering)
