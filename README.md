# InternLog — Every internship application, in one place

> **Track. Apply. Grow.**  
> A clean, responsive internship tracking web application designed for students and college placement coordinators.

[![Deploy static content to Pages](https://github.com/ClashLex/InternLog/actions/workflows/static.yml/badge.svg)](https://github.com/ClashLex/InternLog/actions/workflows/static.yml)
[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-2563eb?style=flat&logo=github)](https://clashlex.github.io/InternLog/)

---

## Overview

**InternLog** replaces disorganized spreadsheets and missed deadlines with an internship-first management system. Students can monitor every stage of their recruitment process from initial application to final offer letter, complete with interview dates, stipends, notes, and CSV export for placement compliance.

---

## Getting Access

Create a new account from the [Registration Page](https://clashlex.github.io/InternLog/user/register.html), then sign in at the [Student Portal](https://clashlex.github.io/InternLog/user/login.html). The app starts with no prebuilt profiles or records — every entry is created by its owner.

---

## Key Features

### Student Workspace
- **Personal Dashboard**: Live counts, status breakdown, upcoming interviews, and recent application log.
- **Application Tracker**: Add, edit, view, and delete internship applications with fields for company, role, location, internship mode (On-site/Hybrid/Remote), dates, stipend, URL, and interview notes.
- **Search & Filter**: Search that filters as you type across company names, roles, locations, and status categories.
- **CSV Data Export**: One-click RFC 4180 compliant CSV export ready for college placement cell record submissions.
- **Account & Security**: Profile editor with college/course info, password change, and optional stay-signed-in.

### Design & Accessibility
- **Modern Design System**: Instrument Serif voice with Helvetica metadata, high-contrast blue palette, clean cards and tables, and status color coding.
- **Dark Mode**: One-tap light/dark switch on every page (black surfaces, yellow accent in dark). Choice persists per device; otherwise follows the OS setting.
- **Mobile Responsive**: Adaptive grid layouts with collapsible sidebar drawer and mobile hamburger navigation on the landing page.
- **Accessible & Clean**: Semantic landmarks, keyboard dismissal with ESC, visible focus states, and readable contrast.
- **Zero-Dependency Core**: Pure Vanilla JavaScript and CSS — zero bloated dependencies or heavy build processes.

---

## Project Structure

```text
InternLog/
├── .github/
│   └── workflows/
│       └── static.yml          # GitHub Pages automated deployment workflow
├── admin/                      # Restricted console (not linked anywhere in the UI)
│   ├── applications.html       # All student applications & status editor
│   ├── dashboard.html          # Global statistics & activity feed
│   ├── login.html              # Console authentication
│   ├── profile.html            # Console profile settings
│   └── users.html              # Student accounts & moderation
├── css/
│   └── style.css               # Shared design system, layout, & responsive styling
├── js/
│   └── script.js               # Data layer (localStorage), state, validation & UI handlers
├── user/                       # Student workspace
│   ├── add-application.html    # Log new internship application
│   ├── applications.html       # Student applications list, search, & CSV export
│   ├── dashboard.html          # Student overview, statistics, & upcoming interviews
│   ├── edit-application.html   # Update or delete existing application
│   ├── login.html              # Student authentication
│   ├── profile.html            # Profile info & password management
│   └── register.html           # New student registration
├── index.html                  # Landing page & feature showcase
├── 404.html                    # Custom not-found page (auto-served by GitHub Pages for unknown URLs)
└── README.md                   # Project documentation
```

Any address that doesn't match a real page — including guessed paths — renders `404.html` with links back to Home and Login. There is intentionally no sitemap or index of restricted areas.

---

## Backend Roadmap (Java / Spring Boot)

The data layer in `js/script.js` has been explicitly designed to mirror RESTful API endpoints:

| Frontend Method | Future REST Endpoint | Description |
| :--- | :--- | :--- |
| `loginUser(creds)` | `POST /api/auth/login` | Authenticate user session |
| `registerUser(data)` | `POST /api/auth/register` | Register new student account |
| `getApplications()` | `GET /api/applications` | Fetch all applications (console) |
| `getApplicationsByUser()` | `GET /api/applications?user={id}` | Fetch student applications |
| `addApplication(data)` | `POST /api/applications` | Create new application |
| `updateApplication(id, patch)` | `PUT /api/applications/{id}` | Update application fields or status |
| `deleteApplication(id)` | `DELETE /api/applications/{id}` | Remove application record |
| `getUsers()` | `GET /api/users` | List registered students (console) |

Replacing the local storage handlers with `fetch()` requires zero changes to the presentation layer.

---

## License

This project is licensed under the MIT License — feel free to customize and expand for your academic or personal use.
