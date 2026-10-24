
# TrustVault — Threat Model

## 1. Project Overview

TrustVault is a secure document-sharing web application. Users can register as Owners or Viewers. Owners can upload documents and grant or revoke access. Viewers can access documents shared with them. Administrators can review audit logs.

## 2. Assets to Protect

- User credentials and password hashes
- Session identifiers and authenticated sessions
- Uploaded documents and their contents
- Document permissions and ownership
- User roles and account information
- Audit logs and database records
- Database credentials and application secrets

## 3. Threats and Mitigations

### T1: Unauthorized Document Access

**Threat:** A user attempts to view or download a document without permission.

**Mitigations:**
- Enforce document access checks on the backend.
- Verify ownership or an applicable permission before serving a document.
- Recheck authorization after permissions are revoked.
- Do not rely only on hidden frontend controls.

### T2: Privilege Escalation

**Threat:** A user attempts to register as an administrator or modify their role without authorization.

**Mitigations:**
- Allow public registration only for the Owner and Viewer roles.
- Validate the requested role on the backend.
- Do not allow public registration to create administrator accounts.
- Enforce role-based authorization on protected backend routes.

### T3: Credential Theft and Brute-Force Attacks

**Threat:** Attackers attempt to guess passwords or obtain stored credentials.

**Mitigations:**
- Hash passwords using Argon2.
- Require passwords to meet the application's minimum length.
- Apply rate limits to registration and other appropriate endpoints.
- Keep secrets out of source control.

### T4: Session Theft or Session Abuse

**Threat:** An attacker attempts to reuse a stolen session or exploit insecure session handling.

**Mitigations:**
- Store sessions server-side using the configured PostgreSQL session store.
- Use secure cookie settings appropriate for production HTTPS.
- Use an unpredictable session secret.
- Destroy sessions during logout and invalidate sessions when appropriate.

### T5: Malicious or Oversized File Uploads

**Threat:** A user uploads an unsupported, oversized, or malicious file.

**Mitigations:**
- Restrict supported file types and maximum upload size.
- Validate uploads on the backend.
- Store uploaded files so they cannot be executed as application code.
- Avoid trusting a filename or client-provided MIME type alone.

### T6: Cross-Site Scripting (XSS)

**Threat:** Malicious content is displayed or executed in a user's browser.

**Mitigations:**
- Escape or safely render untrusted text.
- Avoid inserting untrusted data as raw HTML.
- Apply appropriate browser security headers.

### T7: Cross-Site Request Forgery (CSRF)

**Threat:** A malicious website attempts to trigger authenticated actions using a victim's session.

**Mitigations:**
- Configure session cookies with appropriate SameSite and Secure settings.
- Validate request origins where appropriate.
- Use CSRF tokens or other suitable protections where required by the application's cookie and request design.

### T8: SQL Injection

**Threat:** An attacker submits crafted input to manipulate database queries.

**Mitigations:**
- Use parameterized SQL queries.
- Validate and constrain user input.
- Avoid constructing SQL statements by concatenating untrusted input.

### T9: Sensitive Information Exposure

**Threat:** Credentials, document contents, or internal errors are exposed.

**Mitigations:**
- Keep environment files and secrets out of Git.
- Avoid returning stack traces or sensitive details to clients.
- Restrict database access.
- Avoid logging passwords, session secrets, or document contents.

### T10: Abuse of Document Permissions

**Threat:** An owner or attacker attempts to grant, change, or revoke permissions improperly.

**Mitigations:**
- Check ownership before permission-management operations.
- Validate permission levels on the backend.
- Record important security-sensitive actions in audit logs.
- Test that revocation prevents subsequent unauthorized access.

## 4. Security Testing

The following application behaviors have been manually tested during development:

- New user registration and login
- Viewer interface restrictions
- Shared document visibility
- Downloading a shared document
- Revocation removing the document from the viewer's list

**Important:** A document disappearing from the interface does not, by itself, prove that direct downloads are blocked after revocation. Backend authorization must be tested separately.

## 5. Residual Risks

- A compromised user account may expose documents available to that account.
- Previously downloaded files cannot be remotely removed from a user's device.
- File type checks do not guarantee that a file is harmless.
- Rate limiting and session protections require appropriate configuration and testing.
- Security headers, CSRF protections, and direct-access authorization must be verified against the deployed application.

## 6. Incident Response

If a security incident is suspected:

1. Restrict affected accounts or sessions.
2. Review relevant audit logs.
3. Revoke affected permissions and rotate compromised secrets.
4. Investigate the cause and fix the vulnerability.
5. Retest the fix before restoring normal operation.
