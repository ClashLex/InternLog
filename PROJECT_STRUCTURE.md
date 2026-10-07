# InternLog — full program structure (frontend + backend)

How to read this file: start at §1 (map), then §2–§4 (frontend), §5–§8 (backend),
§9 (how they connect), §10 (run). Every file in the repo is listed with its
properties (key IDs/fields/endpoints) and functions.

## 1. Repository map

```
InternLog/
├── index.html                  # landing page
├── 404.html                    # not-found page (standalone CSS)
├── README.md                   # product overview
├── BACKEND.md                  # backend + API + run guide
├── PROJECT_STRUCTURE.md        # this file
├── .gitignore                  # java/maven/env/node/OS ignores
├── .github/workflows/static.yml# GitHub Pages deploy
├── css/style.css               # single shared stylesheet + dark mode
├── js/
│   ├── script.js               # data layer (localStorage) + all page logic
│   └── api.js                  # backend adapter, overrides window.InternLog
├── user/                       # student role (7 pages)
│   ├── login.html / register.html
│   ├── dashboard.html          # stats + interviews + follow-ups + alerts
│   ├── applications.html       # tracker table + FollowUp filter + CSV
│   ├── add-application.html / edit-application.html
│   └── profile.html
├── company/                    # company role (7 pages)
│   ├── login.html / register.html
│   ├── dashboard.html
│   ├── internships.html        # dual-mode: company manage + public board
│   ├── add-internship.html
│   ├── applicants.html
│   └── profile.html
├── admin/                      # admin role (6 pages, hardcoded gate)
│   ├── login.html
│   ├── dashboard.html
│   ├── users.html              # students + companies + internships 3-in-1
│   ├── internships.html        # dedicated moderation queue
│   ├── applications.html
│   └── profile.html
└── backend/                    # Spring Boot + MySQL (optional; frontend works without it)
    ├── pom.xml / Dockerfile / docker-compose.yml
    └── src/main/java/com/internlog/
        ├── InternLogApplication.java
        ├── model/ (User, Company, Internship, Application, SavedSearch + 3 enums)
        ├── repository/ (5 JpaRepository interfaces)
        ├── dto/ (AuthDtos, InternshipRequest, ApplicationRequest)
        ├── service/ (6 interfaces) + service/impl/ (5 impls)
        ├── controller/ (7 controllers)
        ├── security/ (SecurityConfig, JwtUtil)
        └── exception/ (NotFound, BadRequest, handler)
```

## 2. Root files

### `index.html`
Landing page. Properties: `.site-header` nav (`Home, #about, #features, company/internships.html, company/login.html, user/login.html, user/register.html`), hero CTA, `#about` 2 cards, `#features` 7 cards, `#how` 4 steps, footer nav. Functions: none inline; uses `script.js` for mobile nav (`#landingMenuBtn/#landingMobileNav`) + theme toggle injection. Connects to: `user/register.html`, `company/internships.html` (public board).

### `404.html`
Standalone (own `<style>`, no `style.css`/`script.js` dependency so it works on any broken path). Properties: `.code 404`, links `index.html` + `user/login.html` (relative, fork-safe). Dark variant via `prefers-color-scheme`. Connects to: home, student login.

### `README.md`
Product overview, role workflows, moderation-state tables, project tree, prototype limits, future REST map. No code.

### `BACKEND.md`
Backend + API + run guide: frontend/backend switch, endpoint table, local vs hosted runs, verification script, prototype caveats.

### `.gitignore`
Ignores: `target/ *.class *.jar *.war`, `.mvn/`, H2 `data/ *.mv.db`, `mysql-data/`, `.env*`, `node_modules/ dist/ build/`, `.DS_Store`, `.idea/ .vscode/`, `*.log`. Nothing frontend-specific (localStorage never touches git).

### `.github/workflows/static.yml`
Deploy static content to Pages. Properties: triggers `push: main` + `workflow_dispatch`; permissions `contents:read pages:write id-token:write`; concurrency `pages`. Job `deploy` (ubuntu-latest, env `github-pages`): `checkout@v4` → `configure-pages@v5` (`enablement:true` so first deploy doesn't crash) → `upload-pages-artifact@v3` (`path: '.'`) → `deploy-pages@v5`. Connects to: repo Settings → Pages → Source must be "GitHub Actions".

## 3. Frontend shared assets

### `css/style.css` (517 lines)
Single design system. Properties (CSS vars): `--bg/--surface/--text/--muted/--border`, `--primary/--primary-dark/--primary-light`, `--success/--warning/--danger/--info/--purple` (+bg variants), radii, shadows, `--ff-serif/--ff-sans`. Sections: landing (header/nav/hero/grid cards/steps/footer), buttons/forms (`.btn/.btn-secondary/.btn-danger/.btn-success`, inputs, `.field-error`, `.form-row`), auth split layout, app layout (sidebar/topbar/user-chip/stat-grid/toolbar/table/badge/status-bars/empty/toast/modal/profile/alert). Dark mode (`:root[data-theme="dark"]`): same blue brand lifted (`hsl(217 91% 70%)`), dark surfaces, explicit overrides for `.stat/.table-wrap/td/.empty/.auth-card` (these had hardcoded `#fff` that leaked white blocks before the fix). Functions: none (declarative); consumed by every HTML page.

### `js/script.js` (~2000 lines, one IIFE, `defer`)
Source of truth when no backend. Key properties (storage keys): `internlog_users`, `internlog_applications`, `internlog_session`, `internlog_companies`, `internlog_internships`, `internlog_saved_searches`, `internlog_saved_internships`, `internlog_followup_snooze`, `internlog_seen_internships_*`, `internlog_theme`, `internlog_seeded_v3`; `STATUSES = [Applied…Rejected]`.
Functions by group:
- storage/esc: `readJSON/writeJSON/esc/fmtDate/injectFavicon/seedIfNeeded`
- users: `getUsers/getUserById/registerUser/updateUser/deleteUser` (delete cascades apps)
- applications: `getApplications/getApplicationsByUser/getApplicationById/addApplication/updateApplication/deleteApplication` (update stamps `updatedAt`)
- companies/internships: `getCompanies/getCompanyById/updateCompany/deleteCompany` (cascades), `getInternships/getInternshipsByCompany/getInternshipById/addInternship/updateInternship/deleteInternship` (guards: unapproved company never auto-publishes; past deadline → Expired)
- moderation: `todayISO/companyIsApproved/companyStatusLabel/normalizeOpportunityStates`, `registerCompany/loginCompany/companySessionContext/guardCompanyPage` (exempts `login/register/internships.html` so the public board works), `readInternshipForm/initCompany*` (register/login/submit/moderation controls incl. delete-company + delete-job with `__internlogRerenderModeration` hook)
- auth: `loginUser` (incl. hardcoded `admin@internlog.com/admin123` fallback), `loginAdmin`, `getSession/setSession/clearSession/requireAuth` (redirects per role incl. company), `initNavigation` (`#sidebar/#menuBtn/#sidebarBackdrop`, `.active` link, `[data-logout]` toast+redirect, `[data-password-toggle]`, `[data-user-*]` chips, ESC closes modal), `initThemeToggle/initSecretConsoleAccess` (5-tap brand → console pass) / `initConsoleGate` (fake 404)
- thoughtful helpers: `daysSince/lastActivityISO/getSnoozeMap/isSnoozed/snoozeFollowup/getFollowups` (Applied 7d, Shortlisted 5d, interview±3d), `getSavedSearches/saveSearch/deleteSavedSearch/matchesSearch/getSeenIds/markInternshipsSeen/getMatchedAlerts`
- pages: `initUserDashboard` (stats, status bars, recent, upcoming, follow-ups `#followupList/#followupCount`, alerts `#jobAlertsList`), `initUserApplications` (`#searchInput/#statusFilter` incl. `FollowUp` value, `Follow up` pill, CSV), `initAdd/EditApplication`, `initUserProfile`, `initAdminDashboard/Users/Applications/Profile`
- export: `window.InternLog` exposes every CRUD + `getPublicInternships/getFollowups/alerts/matchesSearch/showNotification` — this exact surface is what the backend mirrors.

### `js/api.js` (loads AFTER `script.js`)
Backend adapter, same signatures. Properties: `internlog_use_api` (`1` default / `0` local-only), `internlog_api_base` (default `http://localhost:8080`), `internlog_api_token` (auto). Functions: `useApi/base/token/req/ping`, `toInternshipRequest/toApplicationRequest` mappers, `install()` which wraps each `window.InternLog.*` with `withFallback(fetch → localStorage)`, plus `setCompanyStatus/setInternshipStatus/setApplicationStatus/applyToInternship` and `_mirrorApply/_mirrorApplicationStatus` (board inline writers call these fire-and-forget). Exposes `window.InternLogConfig {base/setBase/isEnabled/setEnabled/clearToken/ping}`. Connects: pages → `window.InternLog` → `fetch(API_BASE/api/…)` or localStorage fallback.

## 4. Frontend pages (role by role)

Conventions: every app page has `#sidebar/#menuBtn/#sidebarBackdrop`, `.topbar` with user chip, `data-logout` handled by shared JS. Auth pages use `.auth-wrap` split layout.

**`user/login.html`** — student sign-in. IDs: `#loginForm/#email/#password/#remember/#forgotPasswordLink/#formAlert`. Hook: `initUserLogin` (admin fallback inside `loginUser`, remember stored as flag, forgot shows placement-cell toast).
**`user/register.html`** — student sign-up + terms modal. IDs: `#registerForm/#fullName/#email/#password/#confirmPassword/#college/#course/#gradYear/#terms/#termsLink/#termsModal/#termsClose`. Hook: `initRegister`.
**`user/dashboard.html`** — overview. IDs: `#userStats/#statusOverview/#upcomingList/#recentBody/#recentTable`, new `#followupList/#followupCount/#jobAlertsList`. Hook: `initUserDashboard`. Links to board + add-application.
**`user/applications.html`** — tracker. IDs: `#searchInput/#statusFilter` (incl. `FollowUp`), `#resultCount/#exportCsvBtn/#emptyState/#noResults/#appsTableWrap/#appsBody/#modalBackdrop/#modalBody`. Hook: `initUserApplications`.
**`user/add-application.html`** — manual entry. IDs: `#addForm/company/role/location/internshipType/appliedDate/deadline/stipend/status/url/interviewDate/notes`. Hook: `initAddApplication`.
**`user/edit-application.html`** — edit/delete via `?id=`. IDs: `#editForm` (same fields) + `#deleteBtn`. Hook: `initEditApplication` (ownership check).
**`user/profile.html`** — academic info + stats + password. IDs: `#profileWrap[data-kind=user]/#avatarBig/#profileName/#profileEmail/#profileMeta/#profileStats/#profileForm(fullName/college/course/gradYear)/#passwordForm(currentPassword/newPassword/confirmNewPassword)`. Hook: `initUserProfile`.

**`company/login.html`** — company sign-in (owns its logic; shared login guard is a no-op). Inline: email/PW validation, Suspended/Rejected/Pending messages, `?pending=1` banner, approved-session fast-path to dashboard.
**`company/register.html`** — sign-up → Pending. IDs: `#companyRegisterForm/companyName/email/password/confirmPassword/website/location/industry/terms/#formAlert`. Hook: shared `initCompanyRegisterGuard` (single source, no inline duplicate).
**`company/dashboard.html`** — stats + recent posts. IDs: `#companyNameChip/#companyEmailChip/#welcomeName/#companyAvatar/#stats/#recentPosts/#profileNote`. Inline renders from localStorage; logout via shared `[data-logout]`.
**`company/internships.html`** — dual-mode. Company mode: manage own posts (`#pageTitle Internships`, `#postButton`, `#statusFilter` all 8 states, `#cards`). Public mode (no company session): title becomes "Internship Opportunities", nav collapses to Opportunities + Student Dashboard, `Back to Home`, status filter hidden, `#saveSearchBtn` + `#alertsPanel/#alertsList` appear, `Save/Apply` in `#jobModal`. Inline `render()` + `openModal()`; save uses `SAVED` (string ids), apply writes `APPS` + mirrors via `_mirrorApply`; seen-ids marked via `markInternshipsSeen`.
**`company/add-internship.html`** — create/edit (`?edit=`). IDs: `#internshipForm/title/location/type/stipend/positions/deadline/skills/description/education/applyUrl/published/#success/#docTitle/#pageTitle/#submitButton`. Hooks: shared submit guard + inline prefill/chip/`deadline.min`.
**`company/applicants.html`** — review applicants to own jobs. IDs: `#search/#status/#body/#appModal/#modalTitle/#modalBody/#close`. Inline: job map by `companyId` or name fallback, `Review → #newStatus → Save` writes + mirrors via `_mirrorApplicationStatus`.
**`company/profile.html`** — edit company + password. IDs: chip/avatar ids, `#profileForm(name/email/website/location/industry/description)`, `#passwordForm(current/next/confirm)`, `#status`. Inline: null-safe avatar, duplicate-email guard, shared-logout only.

**`admin/login.html`** — console sign-in. IDs: `#adminLoginForm/#email(type=text)/#password/#formAlert`. Hooks: `initConsoleGate` (fake 404 without tap pass) + `initAdminLogin`. Links to student + company logins.
**`admin/dashboard.html`** — system overview. IDs: `#adminStats/#adminOverview/#recentActivity/#companyModeration` (inline pending feed) + links to `users.html#companies` and `internships.html`. Hook: `initAdminDashboard`.
**`admin/users.html`** — 3-in-1. IDs: `#userSearch/#userStatusFilter/#usersBody` (shared `initAdminUsers`: disable/enable + delete) + `#companies/#companiesBody` + `#internships/#companyJobsBody` (inline `renderModerationTables` renders rows with `data-verify/reject/toggle/delete-company` + `data-approve/reject/archive/delete-job`; shared `initCompanyModerationControls` executes them; `window.__internlogRerenderModeration` lets deletes re-render).
**`admin/internships.html`** — dedicated queue. IDs: `#jobSearch/#jobStatus/#jobsBody/#emptyState`. Fully inline `render()` + `moderate(approve/reject/archive/delete)` via `window.InternLog.*` using short attrs `data-approve/data-reject/data-archive/data-delete`; full matrix for Draft/Pending/Published/Rejected/Suspended/Expired/Archived, each with Delete; delete cascades applications.
**`admin/applications.html`** — all student apps + CSV. IDs: `#adminSearch/#adminStatusFilter/#adminAppsBody/#exportAdminCsvBtn/#modalBackdrop/#modalBody`. Hook: `initAdminApplications` (view modal, per-row status select, delete).
**`admin/profile.html`** — display-name edit. IDs: `#profileWrap[data-kind=admin]/#adminProfileForm(adminName/adminEmail readonly/adminRole)`. Hook: `initAdminProfile`.

## 5. Backend root files

**`backend/pom.xml`** — Spring Boot 3.2.5 parent, Java 17. Deps: `starter-web`, `starter-validation`, `starter-data-jpa`, `mysql-connector-j` (runtime), `h2` (test), `starter-security` (BCrypt + CORS; permit-all prototype policy), `jjwt-{api,impl,jackson}` 0.12.6, `springdoc-openapi-starter-webmvc-ui` 2.5.0, `starter-test`. Build: `spring-boot-maven-plugin`.
**`backend/docker-compose.yml`** — local MySQL 8.4 (`internlog-mysql`, db/user/pass `internlog`, root `root`, port 3306, volume `mysql-data`, healthcheck). Run: `docker compose up -d mysql`.
**`backend/Dockerfile`** — hosted build: `maven:3.9-eclipse-temurin-17` offline-deps → package → `eclipse-temurin:17-jre` runs `app.jar`, `PORT=8080`.
**`backend/src/main/resources/application.properties`** — env-overridable: `DB_URL` (default `jdbc:mysql://localhost:3306/internlog?...`), `DB_USER/DB_PASS` (`internlog`), `DDL_AUTO=update`, dialect MySQL, `CORS_ORIGINS` (localhost Live Server + Pages domain), `JWT_SECRET`, `PORT`, springdoc paths.

## 6. Backend Java — model + repository

**`InternLogApplication.java`** — `@SpringBootApplication` entry point.
**`model/User.java`** (`@Entity users`): `id, name, email UNIQUE, passwordHash, college, course, gradYear, registeredDate, status`. Getters/setters only.
**`model/Company.java`** (`@Entity companies`): same + `website/location/industry/description`, `status:CompanyStatus`, `verified`, `approvalStatus`; method `isApproved()` = `verified && status==Active`.
**`model/Internship.java`** (`@Entity internships`): `company ManyToOne + companyName` denormalized, `title/location/type/stipend/positions/deadline/skillsCsv/description/education/applyUrl`, `status:InternshipStatus`, `createdAt/updatedAt/moderatedAt/moderationNote`.
**`model/Application.java`** (`@Entity applications`): `user/internship/company ManyToOne` + denormalized `companyName/role/...`, `appliedDate/deadline/interviewDate/stipend/status/url/notes/updatedAt`. Covers manual + board rows.
**`model/SavedSearch.java`** (`saved_searches`): `user ManyToOne, query/location/type/minStipend/createdAt`.
**`model/ApplicationStatus`** enum `Applied…Rejected` (mirrors `STATUSES`). **`model/CompanyStatus`** `Pending/Active/Rejected/Suspended`. **`model/InternshipStatus`** `Draft/Pending_Review/Published/Rejected/Expired/Archived/Suspended` + `fromString()` (accepts `"Pending Review"`) + `toFrontend()`.
**Repositories** (all `JpaRepository`): `UserRepository (findByEmailIgnoreCase/existsByEmailIgnoreCase)`, `CompanyRepository (+findByStatus)`, `InternshipRepository (findByCompanyId/findByStatus*)`, `ApplicationRepository (findByUserId*/findByUserIdAndInternshipId/findByInternshipId/findByCompanyId/deleteByInternshipId/deleteByCompanyId/deleteByUserId)`, `SavedSearchRepository (findByUserId)`.

## 7. Backend Java — dto + service + controller + security + exception

**`dto/AuthDtos.java`** — records: `RegisterUserRequest, RegisterCompanyRequest, LoginRequest, AuthResponse(token/role/userId/name/email), UserResponse, CompanyResponse(+internshipCount), InternshipResponse (frontend field names incl. `internshipType`, `skills[]`), ApplicationResponse (incl. `studentName/studentEmail`), SavedSearchResponse, StatusPatch, Message`.
**`dto/InternshipRequest.java`** — `companyId/title/location/internshipType/stipend/positions/deadline/skills[]/description/education/applyUrl/publishRequested`. **`dto/ApplicationRequest.java`** — `userId/internshipId/company/role/location/internshipType/appliedDate/deadline/interviewDate/stipend/status/url/notes`.
**Services (interface + impl = OOP demo):** `UserService(Impl)` register (duplicate-email guard, BCrypt)/get/list/update/delete (cascades apps); `CompanyService(Impl)` register (Pending/unverified)/update (duplicate-email guard)/`setStatus` (verify→Active/Approved, reject, suspend, pending)/delete (cascades internships+apps); `InternshipService(Impl)` create (`resolveStatus`: publish→Pending Review, never auto-publish unapproved; past deadline→Expired)/list(status/companyId/q)/`publicBoard` (Published + approved company + not expired)/update (edit resubmits Pending Review + note)/`setStatus` (approve with company+deadline guards, reject, archive, draft/pending/expired/suspended)/delete (cascades apps); `ApplicationService(Impl)` create/`applyToInternship` (duplicate `(userId,internshipId)` guard, non-Published rejected)/list/needsFollowup (Applied 7d, Shortlisted 5d, interview±3d)/update/`setStatus`/delete; `AlertService(Impl)` save/list/delete/`matches` (Published + query/location/type/minStipend)/`matchesFor`; `AuthService` loginUser (incl. hardcoded admin fallback issuing `role:admin`) + loginCompany (Suspended/Rejected/Pending gates) issuing JWT via `JwtUtil`.
**Controllers (every frontend call has an endpoint):** `AuthController (POST /api/auth/register|/login)`, `UserController (GET /api/users|/{id}, PUT /{id}, DELETE /{id})`, `CompanyController (POST /register|/login, GET /|/{id}, PUT /{id}, PATCH /{id}/status, DELETE /{id})`, `InternshipController (GET / [status,companyId,q], GET /board, GET /{id}, POST /, PUT /{id}, PATCH /{id}/status, DELETE /{id})`, `ApplicationController (GET /api/applications [userId,status,q,needsFollowup], GET /needs-followup, GET /{id}, POST /, POST /api/internships/{id}/apply?userId=, PUT /{id}, PATCH /{id}/status, DELETE /{id})`, `AlertController (GET/POST /api/alerts?userId=, DELETE /{id}, GET /matches?userId=)`, `AdminController (GET /api/admin/dashboard [totals + byStatus], GET /api/admin/users)`.
**`security/SecurityConfig.java`** — `BCryptPasswordEncoder`, CORS from `app.cors.allowed-origins`, CSRF off, permit-all `/api/**` (prototype; harden with JWT filter before production). **`security/JwtUtil.java`** — `issue(role,userId,email)` HS256 with `app.jwt.secret/expiry-ms`.
**`exception/`** — `NotFoundException`, `BadRequestException`, `ApiExceptionHandler` (`404 {message}`, `400 {message}`, validation → first field error).
**`src/test/.../InternshipStatusTest.java`** — parses `"Pending Review"` labels.

## 8. Config / infra files

`.gitignore` (java/maven/env/node/OS), `backend/pom.xml`, `backend/docker-compose.yml`, `backend/Dockerfile`, `application.properties`, `.github/workflows/static.yml` — properties and functions as in §2/§5.

## 9. How everything connects

```
Landing (index.html) → student auth (user/login|register) → dashboard (stats/followups/alerts)
  → applications (CRUD + FollowUp filter) ⇄ board (company/internships.html public)
  → board Apply → applications row → company applicants status → student dashboard
Company: register (Pending) → admin verify (users.html or internships queue) → login
  → dashboard → add-internship (Draft/Pending Review) → admin approve (internships.html/users.html)
  → Published → board → applicants
Admin: 5-tap gate → login (hardcoded) → dashboard feed → users (companies) / internships (queue) / applications
Data: pages → window.InternLog (script.js localStorage) → api.js fetch(API_BASE/api/…) → Spring controllers
  → services (rules) → repositories → MySQL (users/companies/internships/applications/saved_searches)
  → responses reuse frontend field names → pages re-render unchanged
Dark mode + toasts + modals + CSV export stay purely frontend.
```

Status flows: `Company: Pending → Active|Rejected, Active ⇄ Suspended`; `Internship: Draft → Pending Review → Published|Rejected, Published → Archived, any → Delete (cascades apps)`; `Application: Applied → Shortlisted → Interview → Selected|Rejected + follow-up nudges`.

## 10. Run (local vs hosted)

Local: `docker compose -f backend/docker-compose.yml up -d mysql` (or local MySQL + `CREATE DATABASE internlog`) → `cd backend && ./mvnw spring-boot:run` (`:8080`, `/swagger-ui.html`) → repo root `python -m http.server 5500` → `http://localhost:5500` (`api.js` defaults to `http://localhost:8080`, `USE_API=1`). Hosted: Docker build → run with `DB_URL/DB_USER/DB_PASS/CORS_ORIGINS/JWT_SECRET` (HTTPS API required for Pages), managed MySQL, set `internlog_api_base` to the HTTPS URL. Verify: Swagger table in `BACKEND.md` §5 (register company → verify → post → publish → register user → apply → status → alerts/follow-ups → deletes cascade) + `python` static API-presence check + `./mvnw test`.
