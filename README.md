# InternLog — Track Your Internship Journey

> **Track. Apply. Grow.**  
> A clean, responsive internship tracking web application designed for students and college placement coordinators.

[![Deploy static content to Pages](https://github.com/ClashLex/InternLog/actions/workflows/static.yml/badge.svg)](https://github.com/ClashLex/InternLog/actions/workflows/static.yml)
[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-2563eb?style=flat&logo=github)](https://clashlex.github.io/InternLog/)

---

## 🌟 Overview

**InternLog** replaces disorganized spreadsheets and missed deadlines with an internship-first management system. Students can monitor every stage of their recruitment process from initial application to final offer letter, complete with interview dates, stipends, notes, and instant CSV export for placement compliance.

Administrators and college placement cells gain a high-level command center to monitor student engagement, review application logs, and audit outcomes.

---

## 🔑 Getting Access

- **Students:** create a new account from the [Registration Page](https://clashlex.github.io/InternLog/user/register.html), then sign in at the [Student Portal](https://clashlex.github.io/InternLog/user/login.html). The app starts with no prebuilt profiles or records — every entry is created by its owner.
- **Administrators:** sign in at the [Admin Portal](https://clashlex.github.io/InternLog/admin/login.html) with a provisioned admin account. Admin credentials are shared privately and are never published in this repository or on the website.

---

## ✨ Key Features

### 🎓 Student Workspace
- **Personal Dashboard**: Live metric counters, color-coded status breakdown, upcoming interview alerts, and recent application log.
- **Application Tracker**: Add, edit, view, and delete internship applications with fields for company, role, location, internship mode (On-site/Hybrid/Remote), dates, stipend, URL, and interview notes.
- **Search & Filter**: Instant client-side search across company names, roles, locations, and status categories.
- **CSV Data Export**: One-click RFC 4180 compliant CSV export ready for college placement cell record submissions.
- **Account & Security**: Profile editor with college/course info, password manager, and persistent session memory.

### 🛡️ Admin Management Console
- **System Metrics**: Real-time aggregated statistics across all registered students and active applications.
- **Student User Management**: View all student profiles, application counts, and enable/disable/delete accounts.
- **Application Auditing**: Inspect, filter, and adjust application statuses in real-time.
- **Global CSV Reporting**: Download complete system-wide application records with student attribution.

### 🎨 Design & Accessibility
- **Modern Design System**: Powered by Google Fonts (*Inter*), curated HSL/hex palettes, subtle elevations, and status color coding.
- **Mobile Responsive**: Adaptive grid layouts with collapsible sidebar drawer and mobile hamburger navigation on the landing page.
- **Accessible & Clean**: ARIA landmarks, modal dialog focus traps, ESC-key dismissals, and high-contrast focus rings.
- **Zero-Dependency Core**: Pure Vanilla JavaScript and CSS — zero bloated dependencies or heavy build processes.

---

## 📁 Project Structure

```text
InternLog/
├── .github/
│   └── workflows/
│       └── static.yml          # GitHub Pages automated deployment workflow
├── admin/                      # Administration portal
│   ├── applications.html       # All student applications & status editor
│   ├── dashboard.html          # Global statistics & activity feed
│   ├── login.html              # Admin authentication
│   ├── profile.html            # Admin profile settings
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
└── README.md                   # Project documentation
```

---

## 🔌 Backend Roadmap (Java / Spring Boot)

The data layer in `js/script.js` has been explicitly designed to mirror RESTful API endpoints:

| Frontend Method | Future REST Endpoint | Description |
| :--- | :--- | :--- |
| `loginUser(creds)` | `POST /api/auth/login` | Authenticate user session |
| `registerUser(data)` | `POST /api/auth/register` | Register new student account |
| `getApplications()` | `GET /api/applications` | Fetch all applications (Admin) |
| `getApplicationsByUser()` | `GET /api/applications?user={id}` | Fetch student applications |
| `addApplication(data)` | `POST /api/applications` | Create new application |
| `updateApplication(id, patch)` | `PUT /api/applications/{id}` | Update application fields or status |
| `deleteApplication(id)` | `DELETE /api/applications/{id}` | Remove application record |
| `getUsers()` | `GET /api/users` | List registered students (Admin) |

Replacing the local storage handlers with `fetch()` requires zero changes to the presentation layer.

---

## 📄 License

This project is licensed under the MIT License — feel free to customize and expand for your academic or personal use.
