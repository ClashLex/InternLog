# InternLog — architecture

See [README.md](README.md) for the public overview and [BACKEND.md](BACKEND.md)
for the API reference. Complete startup, connection configuration and operational
instructions are kept in the local-only, git-ignored `STARTUP.md` file, which is
not included in repository clones.

## Files

```text
index.html / 404.html             Homepage internship discovery and not-found pages
user/ company/ admin/             Student, company and administrator workspaces
css/style.css                    Shared styling and account connection dialog
css/design-system.css            Application-wide colors, typography, forms and workspace shell
css/landing.css                  Homepage-only layout and opportunity cards
js/script.js                     UI logic, validation, rendering and visual effects
js/api.js                        Java-only REST client, CSRF/session bootstrap, outage gate
js/applicants.js                 Applicant review and confirmed status writes
js/landing.js                    Public homepage board, filters, details, save/apply actions
js/ui-components.js              InternLog-specific React Bits effects and shared navigation/header UX
THIRD_PARTY_NOTICES.md            React Bits attribution and license notice
backend/
  pom.xml                        Java 17, Spring Boot, MySQL; packages frontend assets
  mvnw / mvnw.cmd                Checksum-verified Maven wrapper
  Dockerfile / docker-compose.yml Java application and persistent MySQL deployment
  src/main/java/com/internlog/
    InternLogApplication.java    Java entry point and admin password-hash utility
    model/                      Accounts, internships, applications, searches, preferences
    repository/                 JPA persistence
    dto/                        Validated requests and safe response shapes
    controller/                 REST API, session, CSRF, health and preferences endpoints
    service/                    Business rules
    security/                   Server-session/bearer identity, role and ownership checks
    exception/                  Consistent client errors
  src/main/resources/            Environment-backed settings
    application.properties      MySQL URL, admin credentials, HTTP port and session cookie settings
  src/test/                      H2-backed workflow and security tests
tests/frontend.test.js           Java-only, no-browser-storage regression tests
scripts/check_frontend.py        Frontend JavaScript syntax and link checks
.github/workflows/static.yml     Verify and package the runnable Java application
```

## Runtime

```text
MySQL starts → Java connects and initializes schema → Java serves frontend + REST API
→ frontend verifies readiness → fetches CSRF token and server session
→ workspace initializes → CRUD persists to MySQL
```

Java must be running to serve its own website, but public frontend files may be
served independently. Public navigation and account forms initialize immediately;
readiness failures do not block the page. Account creation/login attempts show a
dismissible connection dialog if Java is unavailable. Live listings use an inline
unavailable state, never an offline data fallback. Private records still require
the backend. There is no browser-storage data layer or seeded account.

### Connection layout

| Setup | Frontend/API | Database address used by Java |
|---|---|---|
| Host Java + Docker MySQL | Java on `http://localhost:8080/` | `localhost:3306/internlog` |
| Host Java + installed MySQL | Java on `http://localhost:8080/` | Configured local MySQL host/port |
| Full Docker stack | `app` container published on host port 8080 | `mysql:3306/internlog` inside Compose |

The frontend and REST API share an origin in the recommended setup. There is no
separate frontend runtime, API-enable switch, or local data synchronization.
`GET /api/health` runs `SELECT 1` and reports `status: ready` only when Java can
reach its database.

The browser's HttpOnly session cookie identifies a Java-held session. Frontend
JavaScript does not store passwords, session identities or tokens in persistent
browser storage. Every page restores the display identity from Java; logout ends
the server session. Cookie-based mutations require a CSRF token. API clients can
alternatively use signed bearer tokens.

### Authentication bootstrap

1. Public UI initializes immediately; `js/api.js` checks `/api/health` silently.
2. `/api/auth/csrf` supplies the temporary CSRF token and header name.
3. `/api/auth/session` restores the current display identity, or returns 401 for a guest.
4. Signed-in users load `/api/preferences`; only backend-dependent data logic waits for `InternLog.ready`.
5. Login rotates the Java session ID. Logout invalidates the Java session.

The HttpOnly cookie is a session identifier, not an application-record store.
JavaScript cannot read it. Display caches and CSRF tokens live only in page memory.
Browser sessions expire after eight hours of inactivity and are lost on backend
restart; MySQL records remain independent of those sessions.

All business records live in MySQL. `account_preferences` stores saved internships,
seen IDs, snoozes, theme and administrator display preferences, scoped by account.
Guest theme changes are temporary and follow the OS again on reload.

## Persistence model

| Table | Responsibility |
|---|---|
| `users` | Student profile, BCrypt password hash and account status |
| `companies` | Company profile, BCrypt password hash, verification and account state |
| `internships` | Company-owned opportunities and publication/moderation state |
| `applications` | Student tracker rows and board applications; optional links to internships/companies |
| `saved_searches` | Student-owned search criteria used for alerts |
| `account_preferences` | JSON preference values scoped by account role, ID and preference name |

Board applications have a unique `(user_id, internship_id)` constraint. Manual
tracker rows may have no internship link. Delete services explicitly remove linked
applications, saved searches and account preferences as applicable; do not assume
all cleanup is provided by database-level cascading.

MySQL Docker data lives in a named volume. H2 exists only in test scope and does
not replace MySQL in normal application runs. Legacy browser-demo records are
ignored, not automatically migrated or erased.

## Roles and rules

- Students manage their own profiles, applications, alerts and preferences.
- Companies register pending verification, manage their own internships and
  review/status-update applicants for their jobs.
- Administrators verify companies and approve/reject/archive/delete internships.
- Published internship edits return to review. Suspension removes public availability;
  restoration does not automatically republish suspended jobs.
- Applying requires an active user, approved company, published non-expired job,
  and a unique user/internship pair.
- User, company and internship deletion removes their dependent records.

```text
Company: registration → Pending → administrator verifies → Active/verified
Internship: Draft or Pending Review → administrator approves → Published
Application: Applied → Shortlisted → Interview → Selected or Rejected
```

Other moderation states include rejected/suspended companies and rejected,
expired, suspended or archived internships. Client-side messages and filters
reflect these states, while Java enforces access and publication rules.

### Important backend components

- `HealthController`: readiness check backed by a database query.
- `AuthController`: student/admin login, CSRF bootstrap, current session and logout.
- `CompanyController`: company login/registration and profile/moderation endpoints.
- `PreferenceController`: validated, authenticated database preference reads/writes.
- `SecurityConfig`: public/static routes, credentials-aware CORS, CSRF and role rules.
- `JwtFilter`: resolves browser-session or bearer identity and checks account availability.
- `AccessPolicy`: object-level ownership checks; submitted client IDs are not trusted.
- Services: approval transitions, deadlines, duplicate applications, password changes
  and deletion cleanup.

Backend controllers and access policies enforce these rules; frontend checks are
only usability aids. Deployment-specific configuration and run instructions belong
in private operational documentation, not public project guides.

## Deployment shape

Java and MySQL are required. Java can run on the host with a local/containerized
database, or both services can run in Docker. Use the private local startup guide
for commands and installation-specific settings.

No frontend build or separate static server is required. The packaged JAR includes
only the frontend assets in its static-resource directory. Docker builds use the
repository root as their context. GitHub Actions packages a Java JAR, not a
standalone GitHub Pages demo.

## Build and verification

The Maven resource configuration copies root HTML and `user/`, `company/`,
`admin/`, `css/`, and `js/` into the JAR's static-resource directory. Java serves
those packaged assets; frontend edits require resource copying/rebuild and restart.
Documentation, backend sources and environment files are not copied as frontend assets.

- `python scripts/check_frontend.py`: validates JavaScript syntax and local HTML references.
- `node --test tests/frontend.test.js`: checks public browsing, account connection prompts, session
  bootstrap, confirmed writes, outages and absence of browser-storage access.
- `mvnw.cmd package` / `bash mvnw package` in `backend/`: runs H2-backed workflow,
  authorization, CSRF, persistence and session tests, then builds the runnable JAR.
- GitHub Actions runs the checks and publishes the Java build as an artifact.

Node.js and Python are development/checking tools only. Java plus MySQL runs the
application; Docker can supply both without a host JDK.
