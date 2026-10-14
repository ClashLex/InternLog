# InternLog — backend architecture and API reference

This is public technical documentation. Complete startup instructions,
connection settings, administrator provisioning and operational troubleshooting
are maintained in the local-only, git-ignored `STARTUP.md` file. That guide is not
included in repository clones; obtain local instructions separately when needed.

See [README.md](README.md) for the project overview and
[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for the file and data model map.

## Runtime

The Java application serves both the frontend and REST API. MySQL holds all
persistent application data. Both services are required for accounts and business
records, while public frontend pages can also be served independently of Java.
There is no offline fallback for application data.

```text
Frontend → Java controllers → access checks → services → repositories → MySQL
```

Public navigation, account forms and presentation initialize without waiting for
Java. A silent readiness check restores any Java-held session and preferences
when available. Live listings show an inline unavailable state if the service is
offline; public browsing remains interactive. A dismissible connection dialog is
shown only when account creation/login attempts cannot reach Java. Private data
operations still require Java and never write a local substitute.

An offline Java server cannot serve a new visit by itself. To browse with Java
stopped, serve the frontend independently using the private startup guide.

## Persistence

| Table | Responsibility |
|---|---|
| `users` | Student profiles, BCrypt password hashes and account states |
| `companies` | Company profiles, password hashes and verification states |
| `internships` | Company-owned opportunities and moderation state |
| `applications` | Student tracker rows and board applications |
| `saved_searches` | Student-owned search criteria for alerts |
| `account_preferences` | Saved jobs, seen IDs, snoozes, themes and display preferences |

Preferences are scoped by account role and ID. Application uniqueness is enforced
for the student/internship pair. Services clean up linked records and account
preferences on deletion as applicable.

Existing browser-demo records are not read or automatically imported/deleted.
The application uses only database-backed business records.

## Sessions and access control

- Browser login sessions are held by Java. An HttpOnly cookie contains the session
  identifier; JavaScript does not persist credentials or session tokens.
- Page memory holds only a temporary display cache and CSRF token. Each new page
  restores these from the backend.
- Login rotates the session ID; logout invalidates the browser session. Account
  availability, role and record ownership are checked server-side.
- Cookie-authenticated writes require CSRF protection. Public login/registration
  routes still apply CSRF checks; the frontend handles the bootstrap automatically.
- API clients can use signed bearer tokens independently of the browser session.
  Browser logout does not revoke separately issued bearer tokens.
- Deployment-specific secrets and administrator credentials belong in the process
  environment, never in tracked documentation or source files.

## Roles and business rules

- Students manage their own profiles, applications, searches and preferences.
- Companies manage only their own opportunities and review/status-update their
  own internship applicants.
- Administrators control company verification and internship publication approval.
- Editing a published internship returns it to review.
- Suspension removes public availability. Restoration does not automatically
  republish suspended internships.
- Applying requires an active student, approved company, published non-expired
  opportunity and no existing application for that student/internship pair.

## API overview

| Capability | Endpoint |
|---|---|
| Backend/database readiness | `GET /api/health` |
| CSRF bootstrap | `GET /api/auth/csrf` |
| Current Java session | `GET /api/auth/session` |
| End Java session | `POST /api/auth/logout` |
| Student registration/login | `POST /api/auth/register`, `POST /api/auth/login` |
| Company registration/login | `POST /api/companies/register`, `POST /api/companies/login` |
| Users | `GET /api/users`, `GET/PUT/DELETE /api/users/{id}` |
| Student password update | `POST /api/users/{id}/password` |
| Companies | `GET /api/companies`, `GET/PUT/DELETE /api/companies/{id}` |
| Company moderation/password | `PATCH /api/companies/{id}/status`, `POST /api/companies/{id}/password` |
| Internship management | `GET/POST /api/internships`, `GET/PUT/DELETE /api/internships/{id}` |
| Public board | `GET /api/internships/board` |
| Internship moderation | `PATCH /api/internships/{id}/status` |
| Applications | `GET/POST /api/applications`, `GET/PUT/DELETE /api/applications/{id}` |
| Board apply | `POST /api/internships/{id}/apply?userId=` |
| Applicant status | `PATCH /api/applications/{id}/status` |
| Follow-ups | `GET /api/applications/needs-followup?userId=` |
| Saved searches | `GET/POST /api/alerts?userId=`, `DELETE /api/alerts/{id}` |
| Alert matches | `GET /api/alerts/matches?userId=` |
| Account preferences | `GET /api/preferences`, `PUT /api/preferences/{name}` |
| Admin monitoring | `GET /api/admin/dashboard`, `GET /api/admin/users` |

Authentication and ownership restrictions apply even when an endpoint accepts
an account ID. A guest session lookup returns 401 normally; that does not imply
backend unavailability. API clients must follow the same authorization rules as
the frontend.

## Build and verification

Maven packages selected frontend assets into the runnable Java JAR. Documentation,
environment files and backend sources are not copied as website assets. Frontend
edits require resource copying/rebuild and restart before the packaged site changes.

Backend tests use isolated H2 and cover access control, CSRF, sessions, preferences,
moderation, applications, password changes and deletion cleanup. Frontend checks
validate syntax, references, mandatory-backend behavior and absence of browser
storage access.

GitHub Actions verifies both layers and uploads the Java build artifact. It does
not deploy a standalone static demo. Production deployments require appropriate
HTTPS/cookie settings, database protection, migrations, backups, rate limiting
and session infrastructure; keep site-specific details in private operational documentation.
