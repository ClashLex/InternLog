# InternLog — Internship tracking, discovery, and management

> **Track. Discover. Apply. Grow.**
>
> A responsive internship management prototype for students, companies, and administrators, built for static deployment on GitHub Pages.

[![Deploy static content to Pages](https://github.com/ClashLex/InternLog/actions/workflows/static.yml/badge.svg)](https://github.com/ClashLex/InternLog/actions/workflows/static.yml)
[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-2563eb?style=flat&logo=github)](https://clashlex.github.io/InternLog/)

---

## Overview

InternLog started as a student-side internship application tracker and has been extended into a three-role prototype:

- **Students** can track their own applications and discover internship opportunities published on the platform.
- **Companies** can create a company account, maintain a company profile, publish internship opportunities, review applicants, and update application status.
- **Admins** can monitor users and companies, verify or reject company accounts, and approve, reject, or archive internship opportunities.

The current version is intentionally designed for **GitHub Pages and prototype/demo use**. Data is stored in the browser with `localStorage`; there is no server-side database or production authentication yet.

---

## Core Workflows

### Student workflow

```text
Register / Login
      ↓
Browse internship opportunities
      ↓
View internship details
      ↓
Save or apply
      ↓
Track application status
```

Students can continue using the original application tracker for internships they record manually, while opportunities created by companies use the shared prototype data layer.

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
Create internship
   ↓
Pending review
   ↓
Admin approves
   ↓
Published to students
   ↓
Students apply
   ↓
Company manages applicants
```

Company accounts can be **Pending, Verified/Active, Rejected, or Suspended**. Internship opportunities can be **Draft, Pending Review, Published, Rejected, Expired, or Archived**.

### Admin workflow

The admin area provides a moderation layer for the prototype:

- Monitor registered students and companies
- Verify or reject company accounts
- Suspend or restore companies
- Delete company records
- Review pending internship opportunities
- Approve or reject opportunities
- Archive published opportunities
- Review application activity

---

## Key Features

### Student workspace

- Personal dashboard with application counts and recent activity
- Add, edit, view, and delete manually tracked applications
- Company-created internship discovery
- Save internship opportunities
- Apply to published opportunities
- Track application status
- Search and filter internship/application records
- CSV export for existing application records
- Profile and password management
- Responsive mobile layout
- Persistent light/dark theme preference

### Company workspace

- Company registration and login
- Admin verification gate before company access
- Company profile management
- Company dashboard with internship and applicant overview
- Create and edit internship opportunities
- Draft support
- Internship moderation state handling
- Deadline validation and expiry handling
- View applicants for company opportunities
- Update applicant status through the recruitment flow

### Admin console

- Admin authentication
- Global dashboard statistics
- Student account management
- Company verification and moderation
- Internship approval workflow
- Internship rejection/archive controls
- Application monitoring

### Design & implementation

- Vanilla HTML, CSS, and JavaScript
- Shared responsive design system in `css/style.css`
- No framework or build step required
- GitHub Pages compatible
- Browser `localStorage` used as the prototype data layer
- Client-side validation and state handling

---

## Project Structure

```text
InternLog/
├── .github/
│   └── workflows/
│       └── static.yml               # GitHub Pages deployment workflow
│
├── admin/
│   ├── applications.html            # Application monitoring
│   ├── dashboard.html               # Admin overview
│   ├── internships.html             # Internship moderation
│   ├── login.html                   # Admin authentication
│   ├── profile.html                 # Admin profile settings
│   └── users.html                   # Student + company moderation
│
├── company/
│   ├── add-internship.html          # Create/edit internship opportunity
│   ├── applicants.html              # Company applicant management
│   ├── dashboard.html               # Company overview
│   ├── internships.html             # Company opportunities management
│   ├── login.html                   # Company authentication
│   ├── profile.html                 # Company profile
│   └── register.html                # Company registration
│
├── css/
│   └── style.css                    # Shared design system and responsive layout
│
├── js/
│   └── script.js                    # Data layer, authentication, workflows, validation and UI handlers
│
├── user/
│   ├── add-application.html         # Add manual application
│   ├── applications.html            # Student applications and CSV export
│   ├── dashboard.html               # Student overview
│   ├── edit-application.html        # Edit/delete application
│   ├── login.html                   # Student authentication
│   ├── profile.html                 # Student profile
│   └── register.html                # Student registration
│
├── index.html                       # Landing page
├── 404.html                         # Custom GitHub Pages not-found page
└── README.md                        # Project documentation
```

---

## Data Model (Prototype)

The browser-side data model separates the major entities used by the three roles.

```text
Users
  └── Students

Companies
  └── Internships
          └── Applications
                └── Students
```

Typical company fields include:

```text
id
name
email
password
website
description
logo
status
verified
createdAt
```

Typical internship fields include:

```text
id
companyId
title
description
skills
location
type
stipend
deadline
positions
status
createdAt
```

Applications reference both the student and the internship so that the company can see applicants without mixing company-created opportunities with the older manually tracked student records.

---

## Moderation States

### Company

| State | Meaning |
|---|---|
| `Pending` | Registration submitted; waiting for admin review |
| `Active` / `Verified` | Company can access its workspace |
| `Rejected` | Registration denied |
| `Suspended` | Company access is blocked by admin |

### Internship

| State | Meaning |
|---|---|
| `Draft` | Saved by company but not submitted for publication |
| `Pending Review` | Waiting for admin approval |
| `Published` | Visible to eligible students |
| `Rejected` | Publication denied |
| `Expired` | Application deadline has passed |
| `Archived` | Removed from active company listings |

Editing an already published opportunity sends it back through the review flow in the prototype.

---

## Running Locally

No build process is required.

1. Clone or download the repository.
2. Open `index.html` in a browser, or serve the folder with a simple static server.
3. Use the student, company, and admin pages from the navigation/known routes.

For GitHub Pages, push the repository and let the included workflow deploy the static files.

---

## GitHub Pages / Prototype Limitations

This project is **not a production authentication system**.

Because it runs entirely as a static site:

- Account records are stored in the browser's `localStorage`.
- Different devices/browsers do not share the same data.
- Client-side credentials and moderation logic are not suitable for production security.
- There is no server-side authorization boundary.
- There is no real email verification, password reset, file upload backend, or persistent database.

This architecture is intentional for the current prototype stage. A production version should replace the local data layer with a real backend, secure authentication, server-side authorization, and a persistent database.

---

## Future Backend Roadmap

A future backend can map the prototype data layer to REST or similar APIs.

| Prototype capability | Example future endpoint | Purpose |
|---|---|---|
| Student login | `POST /api/auth/login` | Authenticate users |
| Student registration | `POST /api/auth/register` | Create student account |
| Company registration | `POST /api/companies/register` | Submit company for review |
| Company verification | `PATCH /api/companies/{id}/status` | Admin moderation |
| Internship creation | `POST /api/internships` | Create opportunity |
| Internship moderation | `PATCH /api/internships/{id}/status` | Approve/reject/archive |
| Internship listing | `GET /api/internships` | Public opportunity discovery |
| Application creation | `POST /api/internships/{id}/applications` | Apply to an opportunity |
| Company applicants | `GET /api/internships/{id}/applications` | Review applicants |
| Application status | `PATCH /api/applications/{id}` | Update recruitment status |
| Student applications | `GET /api/applications?user={id}` | Fetch a student's applications |
| Admin users | `GET /api/users` | Admin monitoring |

A Java/Spring Boot, Node.js, Supabase, or similar backend can replace the browser storage layer without requiring the overall product model to change.

---

## License

This project is licensed under the MIT License. Customize and extend it for academic, portfolio, or prototype use.
