# InternLog — internship tracking and management

**Track. Discover. Apply. Grow.**

InternLog is an internship platform with student, company and administrator
workspaces. It uses **Java 17, Spring Boot and MySQL**, with a responsive
HTML/CSS/JavaScript frontend served by Java.

**Accounts and application data require the backend and database.** Public pages
remain accessible when served independently, even if Java is offline. There is
no browser-stored substitute for application data.

## Features

- **Students:** discover, save and apply to internships; track applications,
  interviews and follow-ups; save searches; manage profiles; export CSV.
- **Companies:** register for verification, submit/edit internships, review
  applicants, update application statuses and manage profiles.
- **Administrators:** verify companies, moderate internships, manage student
  accounts and monitor application activity.
- Responsive layouts, light/dark themes, validation and notifications.
- A shared moss-accent design system and accessible React Bits-inspired motion
  connect the homepage, account pages and all three workspaces.

## Architecture

```text
Frontend → Java REST API → services and access checks → MySQL
```

- Java serves both the website and REST API.
- Application records and signed-in preferences are database-backed.
- Login sessions are managed by Java with HttpOnly cookies and CSRF protection.
- Frontend code does not persist application data in browser storage.
- Backend failures are reported instead of switching to an offline substitute.
- Public browsing is not blocked by connection checks. A dismissible Java
  connection prompt appears only when an account creation or login attempt cannot connect.

## Project layout

```text
user/ company/ admin/             Role-specific HTML pages
css/style.css                    Shared design system
js/                              UI logic and Java API client
backend/                         Spring Boot application, persistence and tests
tests/ scripts/                  Frontend regression and validation tools
.github/workflows/               Automated checks and Java packaging
```

## Documentation

- [BACKEND.md](BACKEND.md): public backend architecture and API reference.
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md): project files and role workflows.
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md): React Bits attribution and license terms.
- Complete local startup instructions are maintained separately in `STARTUP.md`.
  That file is git-ignored and is not included in repository clones or public documentation.

Deployment-specific settings, connection details, credentials and operational
instructions do not belong in this README. Never commit real secrets.

## Development and verification

The Maven wrapper builds the Java application and packages the frontend into its
runnable JAR. Backend tests use isolated H2 rather than an operational MySQL database.
Frontend checks use Node.js and Python; neither is required by the application runtime.

GitHub Actions checks both layers and publishes the Java JAR as a build artifact.
The project does not deploy a standalone GitHub Pages demo.
