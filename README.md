# InternLog — Internship tracking, discovery, and management

> **Track. Discover. Apply. Grow.**
>
> A responsive internship platform for students, companies, and administrators.
> Static frontend deploys to GitHub Pages; optional Java + MySQL backend provides
> shared persistence via REST.

[![Deploy static content to Pages](https://github.com/ClashLex/InternLog/actions/workflows/static.yml/badge.svg)](https://github.com/ClashLex/InternLog/actions/workflows/static.yml)
[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-2563eb?style=flat&logo=github)](https://clashlex.github.io/InternLog/)

---

## Overview

Three roles in one product:

- **Students** track manual applications, discover company-posted opportunities, save and apply, get follow-up nudges and job alerts, and export CSV records.
- **Companies** register (pending review), maintain a profile, publish internships (`Draft` / `Pending Review`), review applicants, and update applicant status.
- **Admins** monitor students and companies, verify/reject/suspend/delete companies, and approve/reject/archive/delete internships.

Two run modes:

- **Prototype (no backend):** everything runs in the browser with `localStorage`. Works on GitHub Pages with zero servers.
- **Backend (Java + MySQL):** `js/api.js` swaps the same `window.InternLog.*` calls to REST (`API_BASE + /api/...`) with automatic fallback to `localStorage` when the API is unreachable.

See `BACKEND.md` for the API table and run guide, and `PROJECT_STRUCTURE.md` for a file-by-file reference.

---

## Core Workflows

### Student workflow

```text
Register / Login
      ↓
Browse internship opportunities
      ↓
View details → Save or Apply
      ↓
Track status → Follow-up nudges → Interview prep
      ↓
Saved-search alerts → New matches on dashboard
```

Manual tracker rows and board applies share the same application pipeline.

### Company workflow

```text
Register
   ↓
Pending verification
   ↓
Admin verifies company
   ↓
Company login unlocked
   ↓
Create internship (Draft / Pending Review)
   ↓
Admin approves
   ↓
Published to students
   ↓
Students apply
   ↓
Company manages applicants
```

Company accounts: **Pending, Active/Verified, Rejected, Suspended**.
Internships: **Draft, Pending Review, Published, Rejected, Expired, Suspended, Archived**.
Editing a published opportunity resubmits it for review.

### Admin workflow

- Monitor students, companies, internships, applications
- Verify/reject/suspend/restore/delete companies (deletes cascade)
- Approve/reject/archive/delete internships (deletes cascade applications)
- Review application activity and dashboard stats

---

## Key Features

### Student workspace

- Personal dashboard with counts, status overview, recent activity
- Manual application tracker (add/edit/view/delete, search, filter)
- Opportunity board discovery + save + one-click apply
- Gentle follow-ups (Applied 7+ days, Shortlisted 5+ days, interview prep/thanks, snooze)
- Saved-search job alerts with new-match badges
- Needs-follow-up filter + pill in the applications table
- CSV export, profile and password management
- Responsive mobile layout, persistent light/dark theme

### Company workspace

- Registration with pending-verification gate
- Profile management with duplicate-email guard
- Dashboard with opportunity/applicant overview
- Create/edit internships with draft support and deadline validation
- Applicant review with status updates
- Public board doubles as student discovery (no login required to browse)

### Admin console

- Global dashboard statistics + moderation feed
- Student enable/disable/delete
- Company verification and full lifecycle control
- Internship approval workflow with full matrix (every state has Approve/Reject/Archive/Delete as appropriate)
- Application monitoring with per-row status control and CSV export

### Design & implementation

- Vanilla HTML, CSS, JavaScript frontend; no frontend build step
- Shared responsive design system in `css/style.css` (blue brand in both themes)
- `js/script.js`: data layer, validation, moderation rules, page logic
- `js/api.js`: backend adapter, same signatures over `fetch()`
- Java 17 + Spring Boot 3 + MySQL backend in `backend/` (optional)
- GitHub Pages compatible

---

## Project Structure

```text
InternLog/
├── .github/workflows/static.yml   # Pages deploy (auto-enables Pages)
├── admin/                         # 6 pages: dashboard, users, internships, applications, login, profile
├── company/                       # 7 pages: dashboard, internships (dual-mode board), add-internship, applicants, profile, login, register
├── user/                          # 7 pages: dashboard (stats + follow-ups + alerts), applications, add/edit, profile, login, register
├── css/style.css                  # shared design system + dark mode
├── js/
│   ├── script.js                  # localStorage data layer + page logic
│   └── api.js                     # REST adapter (same signatures over fetch)
├── backend/                       # Spring Boot + MySQL (optional)
│   ├── pom.xml / Dockerfile / docker-compose.yml
│   └── src/main/java/com/internlog/
│       ├── model/ / repository/ / dto/
│       ├── service/ (+ impl) / controller/
│       └── security/ / exception/
├── index.html / 404.html
├── README.md                      # this file
├── BACKEND.md                     # API table + local/hosted run guide
└── PROJECT_STRUCTURE.md           # file-by-file reference
```

---

## Data Model

Frontend prototype (`localStorage`) and backend (MySQL) share the same entities:

```text
Users (students)
Companies → Internships → Applications → Users
SavedSearches → Users
```

Backend tables: `users`, `companies`, `internships` (FK → companies),
`applications` (FKs → users/internships/companies), `saved_searches` (FK → users).
Passwords are BCrypt-hashed server-side; the browser prototype keeps its own
local records per device.

---

## Moderation States

### Company

| State | Meaning |
|---|---|
| `Pending` | Waiting for admin review |
| `Active` / `Verified` | Can access the company workspace |
| `Rejected` | Registration denied |
| `Suspended` | Access blocked by admin |

### Internship

| State | Meaning |
|---|---|
| `Draft` | Saved by company, not submitted |
| `Pending Review` | Waiting for admin approval |
| `Published` | Visible to students |
| `Rejected` | Publication denied |
| `Expired` | Deadline passed |
| `Suspended` | Removed by company moderation |
| `Archived` | Removed from active listings |

---

## Running

### Frontend only (no backend)

1. Clone the repository.
2. Open `index.html` directly, or serve the folder:
   `python -m http.server 5500` → `http://localhost:5500`
3. Use the student, company, and admin pages from the navigation.

Push to `main` to deploy via the included Pages workflow (Settings → Pages → Source: GitHub Actions).

### With backend (local)

Requires Java 17 + Docker (or a local MySQL with an `internlog` database).

```bash
docker compose -f backend/docker-compose.yml up -d mysql
cd backend && ./mvnw spring-boot:run
# API → http://localhost:8080, docs → http://localhost:8080/swagger-ui.html
```

Frontend connects automatically (`js/api.js` defaults to `http://localhost:8080`,
backend primary with `localStorage` fallback). knobs in localStorage:
`internlog_use_api` (`1`/`0`), `internlog_api_base`, `internlog_api_token` (auto).

### With backend (hosted)

- Build the jar (`mvn -DskipTests package`) and run `java -jar app.jar` on
  Render/Railway/Fly with `DB_URL`, `DB_USER`, `DB_PASS`, `CORS_ORIGINS`, `JWT_SECRET` set.
- Use a managed MySQL add-on for the database.
- Point `internlog_api_base` at the HTTPS API URL (Pages requires HTTPS APIs).

Full endpoint table and verification steps: `BACKEND.md`.

---

## Security Notes

This project ships as a prototype:

- Browser-only mode stores records per device/browser and has no server-side authorization boundary.
- Admin access in the static frontend is a demo gate; harden with real server-side roles before any production use.
- When running the backend, set strong unique values for all credentials and secrets via environment variables — never commit them. Passwords are hashed with BCrypt; rotate tokens and secrets regularly.

---

## License

MIT License. Customize and extend for academic, portfolio, or prototype use.
