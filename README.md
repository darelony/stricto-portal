# SafeTrack – OHS client portal + consulting website

Public website for an occupational health & safety (BZR – *bezbednost i zdravlje na radu*) consulting company in Novi Sad, plus **SafeTrack**, the client portal where client companies follow their OHS obligations, deadlines, employees, trainings, medical exams, inspections and documents, and where consultants manage all of it.

- UI language: Serbian (Latin script), dates `dd.MM.yyyy`, numbers `1.300.000,00`, currency RSD.
- Code, comments and commits: English.
- **No Docker.** Local development, tests and production all use Node.js, pnpm and Neon (serverless Postgres).

---

## Contents

1. [Stack](#stack)
2. [Features](#features)
3. [Local setup](#local-setup)
4. [Environment variables](#environment-variables)
5. [Database: migrations and seed](#database-migrations-and-seed)
6. [Demo accounts](#demo-accounts)
7. [Tests](#tests)
8. [Deploying to Vercel](#deploying-to-vercel-step-by-step)
9. [Changing legal intervals (Settings)](#changing-legal-intervals-settings)
10. [Before going live – placeholders to replace](#before-going-live--placeholders-to-replace)
11. [Architecture notes](#architecture-notes)

---

## Stack

| Area | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions), TypeScript strict |
| UI | Tailwind CSS v4, shadcn/ui (Radix), lucide-react, Recharts, TanStack Table |
| Data | PostgreSQL on Neon + Prisma 6 |
| Auth | Auth.js (NextAuth v5): email magic link (Resend) + email/password (bcrypt), **database sessions** |
| Files | Vercel Blob, **private** storage, served only through an authorized route |
| Email | Resend + React Email templates |
| Scheduling | Vercel Cron (daily deadline reminders) |
| Forms | Zod + react-hook-form |
| Exports | @react-pdf/renderer (PDF), exceljs (Excel) |
| Tests | Vitest (unit), Playwright (e2e) |

## Features

**Public website** (`/`) – home, services overview + one page per service (9 services), about, news/blog (MDX in `content/blog`), contact, privacy policy, cookie notice, and the quote request form (`/zatrazi-ponudu`). The form saves a *Lead*, emails the staff and shows a confirmation. It is protected by a honeypot, a minimum fill time and rate limiting. SEO includes per-page metadata, Open Graph images, `sitemap.xml`, `robots.txt` and JSON-LD.

**Client portal** (`/portal`, roles `CLIENT_ADMIN` and `CLIENT_VIEWER`):
- dashboard with a compliance score, plus overdue / due-in-30-days / valid cards, upcoming deadlines, latest documents and quick actions
- deadline calendar (month view + list) with filters by type and location
- employees with training and medical status badges. When a CLIENT_ADMIN adds an employee, a request to the consultant is created automatically (initial training + preliminary medical exam).
- read-only trainings, medical exams (CLIENT_ADMIN only), equipment and environment tests
- document archive (preview / download)
- requests and messages with attachments
- guided injury report, which creates an URGENT request and emails the consultant immediately
- notifications, profile and email preferences

**Consultant / admin area** (`/admin`, roles `ADMIN` and `CONSULTANT`):
- dashboard across assigned companies (overdue by company, this week's deadlines, new requests, new leads, compliance chart)
- company CRUD with tabs: overview, locations, workplaces, employees, trainings, medical exams, equipment, environment, risk assessment, injuries, PPE, documents, requests, activity
- group training for many employees at once, and CSV/Excel employee import with preview
- obligations engine and a cross-company deadline list (manual obligations too)
- requests as kanban + table, with internal notes
- website leads pipeline with conversion to a client company
- PDF/Excel reports
- users and invites (72 h token), activity log
- settings: legal intervals, reminder offsets, company data, branding

**Daily reminders** (Vercel Cron, 07:00 Europe/Belgrade):
- recalculates obligation statuses
- sends one digest email per consultant (all their companies) and per CLIENT_ADMIN (their company) for items hitting the reminder offsets (default 60/30/7 days) or becoming overdue
- never sends twice for the same obligation, offset and recipient

---

## Local setup

Requirements: **Node.js LTS (20.18+ or 22+)**, **pnpm 10+**, a free **Neon** account. Nothing else needs to be installed.

1. **Install dependencies**

   ```bash
   pnpm install
   ```

   With pnpm 10+, dependency build scripts must be approved. `pnpm-workspace.yaml` already allows Prisma and esbuild.

2. **Create Neon databases.** In the Neon console, create a project (region e.g. *AWS Europe Central (Frankfurt)*), then create two branches:
   - `dev` – your local development database
   - `test` – used only by Playwright (wiped before every e2e run)

   For each branch, copy both connection strings: **pooled** (host contains `-pooler`) and **direct**.

3. **Create `.env.local`**

   ```bash
   cp .env.example .env.local
   ```

   Fill in at least `DATABASE_URL` (dev, pooled), `DIRECT_URL` (dev, direct), `AUTH_SECRET`, `ENCRYPTION_KEY` and `CRON_SECRET`. Generate secrets with:

   ```bash
   npx auth secret                 # AUTH_SECRET
   openssl rand -base64 32         # ENCRYPTION_KEY (exactly 32 bytes, base64)
   openssl rand -hex 32            # CRON_SECRET
   ```

   If `openssl` is unavailable (e.g. on Windows), use `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.

   Without `RESEND_API_KEY`, emails (including magic links and invites) are **printed to the terminal** instead of being sent. Without `BLOB_READ_WRITE_TOKEN`, uploaded files are stored in `./.uploads`. Both are fine for local development.

4. **Create the schema and demo data**

   ```bash
   pnpm db:deploy      # apply migrations to the dev branch
   pnpm db:seed        # fictional demo data (wipes the database first!)
   ```

5. **Run**

   ```bash
   pnpm dev
   ```

   Open http://localhost:3000 for the public site, and http://localhost:3000/prijava to sign in to SafeTrack.

### Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` | `prisma generate` + production build |
| `pnpm vercel-build` | `prisma generate` + `prisma migrate deploy` + build (used by Vercel) |
| `pnpm start` | Run the production build |
| `pnpm lint` / `pnpm typecheck` | ESLint / TypeScript |
| `pnpm db:migrate` | Create a new migration after changing `prisma/schema.prisma` (dev branch only) |
| `pnpm db:deploy` | Apply pending migrations |
| `pnpm db:seed` | Reset all data and load demo data |
| `pnpm db:create-admin` | Create/re-activate an admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` (production bootstrap) |
| `pnpm db:studio` | Prisma Studio |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright e2e tests against the Neon `test` branch |

---

## Environment variables

All variables are documented in [`.env.example`](.env.example).

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Neon **pooled** connection string (used by the app). |
| `DIRECT_URL` | yes | Neon **direct** connection string (used by migrations). |
| `AUTH_SECRET` | yes | Auth.js secret for signing cookies and tokens. |
| `AUTH_URL` | prod | Public URL, e.g. `https://portal.example.rs`. |
| `NEXT_PUBLIC_APP_URL` | yes | Same public URL; used in emails, metadata, sitemap. |
| `ENCRYPTION_KEY` | yes | 32-byte base64 key for AES-256-GCM encryption of personal ID numbers (JMBG). **Never change it** after data exists, or the stored IDs become unreadable. |
| `RESEND_API_KEY` | prod | Resend API key (emails + magic links). |
| `EMAIL_FROM` | prod | Verified sender, e.g. `SafeTrack <portal@example.rs>`. |
| `LEADS_NOTIFY_EMAIL` | no | Comma-separated recipients for new quote requests (default: all admins). |
| `BLOB_READ_WRITE_TOKEN` | prod | Vercel Blob token (added automatically when you connect a Blob store). |
| `CRON_SECRET` | prod | Protects `/api/cron/reminders`. Vercel Cron sends it as a Bearer token. |
| `NEXT_PUBLIC_COMPANY_NAME` | no | Consulting company name shown on the public site. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | no | Admin login created by the seed. |
| `TEST_DATABASE_URL` | e2e | Neon `test` branch connection string (direct). **Wiped before every e2e run.** |
| `DISABLE_RATE_LIMIT` | no | `1` disables rate limiting (set automatically for e2e only). |

---

## Database: migrations and seed

- The schema lives in `prisma/schema.prisma`; migrations live in `prisma/migrations`.
- To change the schema: edit `schema.prisma`, run `pnpm db:migrate --name <change>` against the **dev** branch, and commit the generated migration.
- Production applies migrations automatically during the Vercel build (`prisma migrate deploy` in `vercel-build`).
- `pnpm db:seed` **deletes all data** and loads fictional demo data:
  - 1 admin, 2 consultants
  - 4 companies (construction, manufacturing, retail, office), each with a client admin and a viewer account
  - 2–3 locations, 5–8 workplaces and 16–38 employees per company
  - trainings, medical exams, equipment, environment tests, risk assessments, PPE, injuries, documents, requests and website leads, with deadlines spread across valid / due soon / overdue

  Never run the seed against production.

## Demo accounts

All demo users have the password **`SafeTrack-Demo-2026`** (the admin uses `SEED_ADMIN_PASSWORD` if set).

| Role | Email |
|---|---|
| Admin | `admin@safetrack.local` |
| Consultant | `konsultant1@safetrack.local`, `konsultant2@safetrack.local` |
| Client admin | `klijent.gradnja@demo.safetrack.local` (also `.metal`, `.market`, `.biro`) |
| Client viewer (read-only) | `pregled.gradnja@demo.safetrack.local` (also `.metal`, `.market`, `.biro`) |

---

## Tests

### Unit tests (Vitest)

```bash
pnpm test
```

They cover:
- obligation date calculation and status logic
- reminder offsets and deduplication
- authorization rules for every role
- Zod schemas (Serbian messages)
- encryption, upload rules, formatting
- the CSV/Excel import parser

### End-to-end tests (Playwright)

E2E tests run against a **dedicated Neon branch** (`TEST_DATABASE_URL`), which is reset with `prisma migrate reset` and re-seeded before every run. Point it only at a disposable test branch, never at dev or production data. As a safety net, the config refuses to run if `TEST_DATABASE_URL` equals `DATABASE_URL`.

```bash
# once: install the browser
pnpm exec playwright install chromium

# set TEST_DATABASE_URL in .env.local (or .env.test.local), then:
pnpm test:e2e
```

Playwright builds the app, starts it on port 3100 with local file storage and console emails, and runs:

| Spec | Scenario |
|---|---|
| `e2e/lead.spec.ts` | A visitor submits the quote form, and the lead appears in the admin panel. |
| `e2e/training.spec.ts` | A consultant records a group training, obligations update, and the client sees the new deadline. |
| `e2e/injury.spec.ts` | A client reports an injury, and the consultant gets an urgent request and email. |
| `e2e/access.spec.ts` | A client gets 403 for another company's employee, file, report and the admin area; a consultant gets 403 for an unassigned company; a CLIENT_VIEWER cannot see medical details. |

Useful flags: `E2E_SKIP_BUILD=1` reuses an existing build, and `E2E_SKIP_DB_RESET=1` skips the reset and seed.

---

## Deploying to Vercel (step by step)

1. **Push the repository** to GitHub, GitLab or Bitbucket.
2. **Create the production database.** In Neon, use the project's main branch (or a new project) for production. Copy its **pooled** and **direct** connection strings.
3. **Import the project in Vercel** (*Add New → Project*). Vercel detects Next.js. The build command comes from `package.json` (`vercel-build`), so migrations run automatically. Leave the defaults.
4. **Add a Blob store.** Go to *Storage → Create → Blob* and connect it to the project. This adds `BLOB_READ_WRITE_TOKEN`. Files are uploaded with `access: "private"` and are only served through `/api/files/[id]` after an authorization check.
5. **Set environment variables** (*Settings → Environment Variables*, scope **Production**):
   - Required: `DATABASE_URL` (pooled), `DIRECT_URL` (direct), `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `ENCRYPTION_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`.
   - Optional: `LEADS_NOTIFY_EMAIL`, `NEXT_PUBLIC_COMPANY_NAME`.
6. **Set up Resend.** Add and verify your sending domain (DNS records), create an API key, and set `EMAIL_FROM` to an address on that domain.
7. **Deploy.** The build runs `prisma migrate deploy` against `DIRECT_URL`.
8. **Create the first admin** on the empty production database (never run the demo seed there). Run this once from your machine, with `DATABASE_URL` / `DIRECT_URL` set to the production strings for this one command:

   ```bash
   DATABASE_URL="<prod pooled>" DIRECT_URL="<prod direct>" \
   ADMIN_EMAIL="you@your-company.rs" ADMIN_PASSWORD="A-Strong-Password-123" ADMIN_NAME="Ime Prezime" \
   pnpm db:create-admin
   ```

   The script is idempotent and only creates or re-activates that one admin. Then sign in at `/prijava` and invite consultants and clients from **Korisnici**.
9. **Initialize settings.** In **Podešavanja**, fill in the company data and email footer. Then enter the legal intervals and reminder offsets (see below). On a fresh database the interval fields start empty, meaning no automatic expiry, until you save them.
10. **Cron.** `vercel.json` schedules `/api/cron/reminders` at 05:00 and 06:00 UTC. The route runs only when it is **07:00 in Belgrade**, so the job fires at 07:00 local time in both winter (CET) and summer (CEST). Vercel sends `Authorization: Bearer $CRON_SECRET`, which the route verifies. To trigger it manually:

    ```bash
    curl -H "Authorization: Bearer $CRON_SECRET" "https://your-domain/api/cron/reminders?force=1"
    ```

11. **Domain.** Add your domain in *Settings → Domains*, then update `AUTH_URL` and `NEXT_PUBLIC_APP_URL` and redeploy.

---

## Changing legal intervals (Settings)

Legal intervals are **not hard-coded**. They are stored in the database and edited by an administrator in **Admin → Podešavanja → Zakonski intervali**:

| Interval | Used for |
|---|---|
| Periodic training (other workplaces / high-risk workplaces) | `validUntil` of trainings (initial, periodic, transfer, new equipment) |
| Fire safety training, first aid training | separate tracks for those training types |
| Periodic medical exam (other / high-risk workplaces) | `validUntil` of medical exams (empty = no automatic expiry) |
| Equipment inspection | `nextInspection` after an inspection |
| Environment test | `nextDate` of microclimate, lighting, noise and similar tests |
| Risk assessment review | `nextReviewAt` of the risk assessment act |
| PPE replacement | default `replaceBy` for issued PPE |

How it works:
- Enter the number of **months**. Leave a field empty for "no automatic expiry".
- When a consultant records a training, exam, inspection or test, the form shows the calculated due date. The consultant can override it per record.
- Whether a workplace is **high-risk** (*radno mesto sa povećanim rizikom*, set on the workplace) decides which interval applies.
- Changing an interval affects **new** records only. Existing records keep the dates they were saved with, so historical data stays accurate. To re-date existing records, edit them.
- **Reminder offsets** (default 60/30/7 days) are edited on the same page. The largest offset also defines "uskoro ističe" (due soon).

The seeded values are **starting points only**, marked "uskladiti sa važećim propisima". The consultants must align them with the current Law on Occupational Safety and Health and its bylaws.

---

## Before going live – placeholders to replace

The project never invents company data. Search the code for `[` placeholders and replace them:

- `src/config/site.ts`: company name, legal name, address, phone, email, PIB, MB. Also set `NEXT_PUBLIC_COMPANY_NAME`.
- Website copy in `src/app/(site)` and `src/config/services.ts`: `[BROJ KLIJENATA]`-style placeholders, `[FOTOGRAFIJA: …]` image blocks, and the `[NAPOMENA: …]` notes on the equipment-inspection and environment-testing services. Those two activities require a license in Serbia, so the copy describes the work as organising and coordinating it. State whether the company holds the license itself or works with licensed partners.
- `/politika-privatnosti`: the privacy policy text is marked **[TEKST ZA PRAVNU PROVERU]** and must be reviewed by a lawyer.
- **Podešavanja**: company data, logo, email footer, and the legal intervals.

---

## Architecture notes

- **Authorization.** `src/lib/authz.ts` (`requireUser`, `requireRole`, `requireStaff`, `requireClient`, `requireCompanyAccess`) is called at the top of every page, server action and route handler. The pure rules live in `src/lib/permissions.ts` and are unit-tested. Middleware only redirects visitors without a session cookie, because database sessions can't be validated at the edge. Every query is scoped by `companyId` on the server, and cross-company access returns **403**.
- **Sessions.** Auth.js database sessions are used for both magic link and password sign-in (credentials sign-in writes a database session through a custom `jwt.encode`). Accounts are created only through invites.
- **Health data.**
  - Medical exams are visible only to ADMIN/CONSULTANT and the company's CLIENT_ADMIN, never to CLIENT_VIEWER (pages, files, calendar and dashboard lists).
  - Every view or download is logged as `MEDICAL_VIEW` in the activity log.
  - Personal ID numbers are AES-256-GCM encrypted at rest (`src/lib/crypto.ts`).
- **Obligations engine** (`src/lib/obligations/engine.ts`).
  - Each training, exam, equipment item, environment test, risk assessment and PPE issue has one `Obligation`.
  - Within a "track" (e.g. one employee's fire-safety training), only the newest record is open; older ones are closed as DONE.
  - Recomputing a whole track makes create, edit and delete consistent. Pure date and status logic is in `src/lib/obligations/calc.ts`.
- **Files.**
  - Browser → Vercel Blob directly (token route `/api/upload` checks auth, company, MIME type and the 20 MB limit). The server then verifies the uploaded object with `head()` before registering it.
  - Downloads go only through `/api/files/[id]`.
  - Filenames are sanitized.
- **Security headers** (CSP, X-Frame-Options, Referrer-Policy, HSTS, Permissions-Policy) are set in `next.config.ts`.
- **Rate limiting** is a Postgres fixed-window limiter (`src/lib/rate-limit.ts`). It covers login, magic links, password reset, invites, uploads and the quote form.
- **Emails** live in `src/emails/` (React Email, Serbian, SafeTrack-branded): invite, magic link, password reset, new request, new message, status change, injury reported (urgent), deadline digest, new lead. Every send is recorded in `EmailLog`.
