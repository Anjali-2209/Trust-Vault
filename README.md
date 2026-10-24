# Trust-Vault
Secure document sharing platform with access control and audit trail

# TrustVault — Secure Document Sharing

TrustVault is a web application for uploading documents, sharing them with authorized users, and managing access permissions. It provides role-based functionality for Owners, Viewers, and Administrators.

## Features

- **User registration and login:** Create an account and sign in securely.
- **Role selection:** Choose Owner or Viewer during registration.
- **Owner permissions:** Upload documents, share them, grant read or edit access, revoke access, and delete owned documents.
- **Viewer permissions:** View and download documents shared with the account, subject to the granted permissions.
- **Role-based access control:** Administrative functionality is restricted to authorized administrator accounts.
- **Document search:** Search accessible documents by filename, category, or owner.
- **Audit logs:** Administrators can review recorded security-related activities.
- **Password hashing:** Passwords are hashed using Argon2.
- **Session management:** Server-side sessions are stored in PostgreSQL.
- **Upload restrictions:** The application restricts supported file types and upload size.

## User Roles

| Role | Capabilities |
| --- | --- |
| Owner | Upload and manage owned documents, share them, and manage permissions |
| Viewer | Access documents shared with the account |
| Admin | Review administrative audit information |

Public registration must never allow users to create Admin accounts. Administrator accounts should be provisioned through a trusted administrative process.

## Technology Stack

- **Frontend:** React, Vite, JavaScript, CSS
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **Password hashing:** Argon2
- **Deployment:** Render
- **Cloud database:** Neon PostgreSQL

## Project Structure

```text
Trust-Vault/
├── backend/
│   ├── server.js
│   └── ...
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
├── THREATS.md
├── PROMPTS.md
└── README.md
```

The backend contains the API, authentication, authorization, and database integration. The frontend contains the React application and user interface.

## Prerequisites

Install the following before running the project locally:

- Node.js and npm
- PostgreSQL, or access to a compatible PostgreSQL database
- Git

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/Anjali-2209/Trust-Vault.git
cd Trust-Vault
```

### 2. Install backend dependencies

```bash
npm ci --prefix backend
```

### 3. Install frontend dependencies

```bash
npm ci --prefix frontend
```

### 4. Configure environment variables

Create the required local environment file according to the backend configuration. Configure the database connection string, session secret, application origin, and any other variables required by the application.

Never commit `.env` files, passwords, session secrets, or database credentials to GitHub.

Use a strong, randomly generated session secret and a database account with only the permissions the application requires.

### 5. Configure the database

Create or connect to a PostgreSQL database and run the project's database schema or migrations as required by the backend.

Ensure the required tables exist before starting the application.

### 6. Start the backend

Use the backend's configured start script or entry point. For this project, the server entry point is:

```bash
node backend/server.js
```

### 7. Start the frontend

```bash
npm run dev --prefix frontend
```

Open the local URL printed by Vite in your browser.

## Production Build

From the project root, run:

```bash
npm run build --prefix frontend
```

A successful build confirms that the frontend can be compiled. It does not, by itself, verify backend security or production deployment.

## Security

TrustVault is designed with security controls including:

- Password hashing with Argon2
- Input validation during registration
- Registration rate limiting
- Role-based functionality
- Document permission checks
- PostgreSQL-backed sessions
- Restricted upload types and file sizes
- Audit logging

Security depends on the actual implementation and deployment configuration. In particular, document access must be authorized by the backend on every relevant request, including downloads after permissions are revoked.

See [THREATS.md](THREATS.md) for the threat model, mitigations, and residual risks.

## Testing Checklist

Test the following before a release:

- [ ] A user can register as Owner.
- [ ] A user can register as Viewer.
- [ ] Public registration cannot create an Admin account.
- [ ] Users can log in and log out.
- [ ] Owners can upload permitted files.
- [ ] Owners can grant and revoke document permissions.
- [ ] Viewers cannot upload documents.
- [ ] Viewers can access documents shared with them.
- [ ] Unshared documents are not accessible.
- [ ] Revoked permissions block subsequent document requests and downloads.
- [ ] Invalid or oversized uploads are rejected.
- [ ] Administrative routes reject unauthorized users.

Do not mark a test as passed until it has actually been verified.

## Deployment

The application has been deployed using Render, with PostgreSQL hosted by Neon.

Live application: https://trust-vault-0pcr.onrender.com

GitHub repository: https://github.com/Anjali-2209/Trust-Vault

Deployment availability may vary. The service may take time to start after an idle period.

Configure production environment variables in the hosting provider's dashboard. Never include production secrets in this README or in source control.

## Documentation

- [Threat Model](THREATS.md)
- [AI Assistance Disclosure](PROMPTS.md)

## Responsible Use

TrustVault is a development and demonstration project. Review the implementation, deployment settings, and security tests before using it for sensitive or confidential documents.
