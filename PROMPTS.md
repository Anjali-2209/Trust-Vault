
# TrustVault — AI Assistance Disclosure

## 1. Purpose

This document records how AI assistance was used during the development of TrustVault. It is intended to support transparency and help distinguish AI-assisted guidance from implementation and testing performed by the developer.

## 2. Areas Where AI Assistance Was Used

AI assistance was used to help with:

- Planning application features and user workflows.
- Understanding React components, state, and form handling.
- Implementing and reviewing frontend and backend code.
- Understanding authentication, role-based access control, and document permissions.
- Reviewing registration validation and password-handling logic.
- Troubleshooting build errors and development issues.
- Improving registration form styling and consistency.
- Drafting security documentation, including the threat model.
- Planning manual tests for sharing, downloading, and revoking document access.

## 3. Developer Responsibilities

The developer integrated changes into the project, ran the application, tested user-facing workflows, and reviewed the results.

AI-generated suggestions were treated as assistance and were not assumed to be correct or secure without review and testing.

## 4. Testing and Verification

Manual testing has included:

- Registering and logging in with user accounts.
- Checking the Owner and Viewer interfaces.
- Sharing a document with a Viewer.
- Downloading a shared document.
- Revoking access and confirming that the document disappears from the Viewer's dashboard.
- Running a frontend production build.

Further verification is required for backend authorization, including attempts to access documents directly after permission revocation.

## 5. Limitations

AI assistance does not guarantee that the application is secure, free of defects, or production-ready. Generated code and documentation must be checked against the actual implementation and project requirements.

Security claims should be made only after the relevant protections have been verified.

## 6. Transparency

This document summarizes the categories of AI assistance used during development. It is not a verbatim record of every prompt or response.

The developer remains responsible for understanding, testing, maintaining, and presenting the final project.
