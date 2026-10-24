
import { useEffect, useState } from "react";
import "./App.css";

const API = "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    credentials: "include",
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

function Icon({ name, size = 20 }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    upload: <><path d="M12 16V3m-5 5 5-5 5 5"/><path d="M4 16v4h16v-4"/></>,
    files: <><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2"/><path d="M17 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5"/></>,
    shield: <><path d="M12 2 20 5v6c0 5-3 8-8 11-5-3-8-6-8-11V5z"/><path d="m9 12 2 2 4-4"/></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/></>,
    logout: <><path d="M10 4H4v16h6M15 7l5 5-5 5m5-5H9"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></>,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.files}
    </svg>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [fullName, setFullName] = useState("");
const [authView, setAuthView] = useState("welcome");
const [role, setRole] = useState("viewer");
  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState("college");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditError, setAuditError] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);

  async function loadAuditLogs(page = 1) {
    try {
      setAuditError("");
      const data = await request(`/admin/audit-logs?page=${page}`);
      setAuditLogs(data.logs || []);
      setAuditPage(data.page || page);
      setAuditTotal(data.total || 0);
    } catch (error) {
      setAuditError(error.message);
    }
  }

  async function loadDocuments() {
    const data = await request("/documents");
    setDocuments(data.documents || []);
  }

  useEffect(() => {
    request("/auth/me")
      .then(async (data) => {
        if (!data.user) return;
        setUser(data.user);
        try {
          const result = await request("/documents");
          setDocuments(result.documents || []);
        } catch (error) {
          setMessage(error.message);
        }
        if (data.user.role === "admin") {
          await loadAuditLogs();
        }
      })
      .catch(() => {});
  }, []);

  async function login(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const data = await request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      setUser(data.user);
      setPassword("");
      await loadDocuments();
      if (data.user.role === "admin") {
  await loadAuditLogs();
}
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
async function register(event) {
  event.preventDefault();
  setBusy(true);
  setMessage("");

  if (password.length < 12) {
    setMessage("Password must be at least 12 characters.");
    setBusy(false);
    return;
  }

  try {
    await request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fullName.trim(),
        email: email.trim(),
        password,
        role,
      }),
    });

    setPassword("");
    setFullName("");
    setRole("viewer");
    setMessage("Registration successful! Please sign in.");
    setAuthView("login");
  } catch (error) {
    setMessage(error.message);
  } finally {
    setBusy(false);
  }
}



  async function logout() {
    try {
      await request("/auth/logout", { method: "POST" });
      setUser(null);
      setDocuments([]);
      setAuditLogs([]);
      setAuditError("");
      setAuditPage(1);
      setAuditTotal(0);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function upload(event) {
    event.preventDefault();

    if (!file) {
      setMessage("Please choose a file.");
      return;
    }

    const body = new FormData();
    body.append("file", file);
    body.append("category", category);

    setBusy(true);
    setMessage("");

    try {
      await request("/documents/upload", {
        method: "POST",
        body,
      });

      setFile(null);
      event.target.reset();
      setMessage("Document uploaded successfully.");
      await loadDocuments();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function download(doc) {
    try {
      const response = await fetch(
        `${API}/documents/${doc.id}/download`,
        { credentials: "include" }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Download denied.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = doc.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function grant(id) {
    const targetEmail = window.prompt("Email of the user:");
    if (!targetEmail) return;

    const permission = window.prompt(
      "Enter permission: read or edit",
      "read"
    );

    if (!["read", "edit"].includes(permission)) {
      setMessage("Choose read or edit.");
      return;
    }

    try {
      await request(`/documents/${id}/grant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail.trim(),
          permission,
        }),
      });

      setMessage(`Permission granted to ${targetEmail}.`);
      await loadDocuments();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function revoke(id) {
    const targetEmail = window.prompt("Email to revoke:");
    if (!targetEmail) return;

    try {
      await request(`/documents/${id}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail.trim() }),
      });

      setMessage(`Access revoked for ${targetEmail}.`);
      await loadDocuments();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function remove(id) {
    if (!window.confirm("Permanently delete this document?")) return;

    try {
      await request(`/documents/${id}`, { method: "DELETE" });
      setMessage("Document deleted.");
      await loadDocuments();
    } catch (error) {
      setMessage(error.message);
    }
  }

  const owned = documents.filter((doc) => doc.access === "owner");
  const shared = documents.filter((doc) => doc.access !== "owner");

  const filtered = documents.filter((doc) => {
    const matchesSearch =
      `${doc.filename} ${doc.category || ""} ${doc.owner_name || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "owned" && doc.access === "owner") ||
      (filter === "shared" && doc.access !== "owner");

    return matchesSearch && matchesFilter;
  });

if (!user && authView === "welcome") {
  return (
    <main className="login-page">
      <div className="login-layout">
        <section className="login-intro">
          <div className="brand-mark">
            <Icon name="shield" size={34} />
            <span>Trust<span className="red">Vault</span></span>
          </div>

          <h1>Your documents.<br />Your control.</h1>
          <p>
            A secure workspace for storing documents, sharing access,
            and managing permissions.
          </p>

          <div className="login-features">
            <span><Icon name="lock" /> Controlled access</span>
            <span><Icon name="users" /> Role-based sharing</span>
            <span><Icon name="shield" /> Protected documents</span>
          </div>
        </section>

        <section className="login-card">
          <div className="login-icon">
            <Icon name="shield" size={28} />
          </div>

          <h2>Welcome to TrustVault</h2>
          <p>Securely manage and share your documents.</p>

          <button
            type="button"
            onClick={() => {
              setMessage("");
              setAuthView("login");
            }}
          >
            Login →
          </button>

          <button
            type="button"
            onClick={() => {
              setMessage("");
              setAuthView("register");
            }}
          >
            Create Account →
          </button>
        </section>
      </div>
    </main>
  );
}

if (!user && authView === "register") {
  return (
    <main className="login-page">
      <div className="login-layout">
        <section className="login-intro">
          <div className="brand-mark">
            <Icon name="shield" size={34} />
            <span>Trust<span className="red">Vault</span></span>
          </div>

          <h1>Your documents.<br />Your control.</h1>
          <p>
            Create your account to securely manage and share documents.
          </p>

          <div className="login-features">
            <span><Icon name="lock" /> Controlled access</span>
            <span><Icon name="users" /> Role-based sharing</span>
            <span><Icon name="shield" /> Protected documents</span>
          </div>
        </section>

        <form className="login-card" onSubmit={register}>
          <div className="login-icon">
            <Icon name="users" size={28} />
          </div>

          <h2>Create Account</h2>
          <p>Join TrustVault securely.</p>

          <label htmlFor="register-name">Full name</label>
          <input
            id="register-name"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Your full name"
            autoComplete="name"
            required
          />

          <label htmlFor="register-email">Email address</label>
          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />

          <label htmlFor="register-role">Choose your role</label>          <select
            id="register-role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            required
          >
            <option value="viewer">Viewer — Access shared documents</option>
            <option value="owner">Owner — Upload and share documents</option>
          </select>


          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 12 characters"
            autoComplete="new-password"
            minLength={12}
            required
          />

          <button disabled={busy} type="submit">
            {busy ? "Creating account..." : "Register →"}
          </button>

          {message && <p className="message" role="alert">{message}</p>}

          <p>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setMessage("");
                setAuthView("login");
              }}
            >
              Sign in
            </button>
          </p>

          <button
            type="button"
            onClick={() => {
              setMessage("");
              setAuthView("welcome");
            }}
          >
            ← Back
          </button>
        </form>
      </div>
    </main>
  );
}


  if (!user) {
    return (
      <main className="login-page">
        <div className="login-layout">
          <section className="login-intro">
            <div className="brand-mark">
              <Icon name="shield" size={34} />
              <span>Trust<span className="red">Vault</span></span>
            </div>
            <h1>Your documents.<br />Your control.</h1>
            <p>
              A secure workspace for storing documents,
              sharing access, and managing permissions.
            </p>
            <div className="login-features">
              <span><Icon name="lock" /> Controlled access</span>
              <span><Icon name="users" /> Role-based sharing</span>
              <span><Icon name="shield" /> Protected documents</span>
            </div>
          </section>

          <form className="login-card" onSubmit={login}>
            <div className="login-icon"><Icon name="lock" size={28}/></div>
            <h2>Welcome back</h2>
            <p>Sign in to your secure workspace</p>

            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="username"
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />

            <button disabled={busy} type="submit">
              {busy ? "Signing in..." : "Sign In →"}
            </button>

            {message && <p className="message" role="alert">{message}</p>}
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <Icon name="shield" size={32}/>
          <span>Trust<span className="red">Vault</span></span>
        </div>
        <p className="brand-subtitle">Secure · Share · Control</p>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <a href="#dashboard" className="nav-active">
            <Icon name="dashboard"/> Dashboard
          </a>

          {user.role === "owner" && (
            <a href="#upload">
              <Icon name="upload"/> Upload Document
            </a>
          )}

          <a href="#documents" onClick={() => setFilter("all")}>
            <Icon name="files"/> My Documents
          </a>

          <a href="#documents" onClick={() => setFilter("shared")}>
            <Icon name="users"/> Shared With Me
          </a>

          {user.role === "admin" && (
            <a href="#audit-logs" onClick={() => loadAuditLogs()}>
              <Icon name="clock"/> Audit Logs
            </a>
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-shield">
            <Icon name="shield" size={38}/>
          </div>
          <p>Your files. Your control.</p>
          <strong>TrustVault</strong>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div className="topbar-title">
            <span className="eyebrow">SECURE WORKSPACE</span>
            <h1>Dashboard</h1>
          </div>

          <div className="account">
            <div className="avatar">
              {(user.name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="account-info">
              <strong>{user.name}</strong>
              <small>{user.role}</small>
            </div>
            <button className="logout-btn" onClick={logout}>
              <Icon name="logout" size={17}/> Logout
            </button>
          </div>
        </header>

        {message && (
          <div className="message dashboard-message" role="status">
            {message}
            <button onClick={() => setMessage("")} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}

        <section className="welcome-banner">
          <div>
            <span className="eyebrow">WELCOME BACK</span>
            <h2>Hello, {user.name || "there"}!</h2>
            <p>
              Manage your documents and control who can access them.
            </p>
            <div className="welcome-pills">
              <span><Icon name="shield" size={16}/> Access control</span>
              <span><Icon name="lock" size={16}/> Private files</span>
            </div>
          </div>
          <div className="welcome-art" aria-hidden="true">
            <div className="art-circle">
              <Icon name="shield" size={85}/>
            </div>
          </div>
        </section>

        <section className="stats-grid" aria-label="Document statistics">
          <div className="stat-card stat-blue">
            <div className="stat-icon"><Icon name="files" size={25}/></div>
            <strong>{documents.length}</strong>
            <span>Accessible Documents</span>
          </div>

          <div className="stat-card stat-green">
            <div className="stat-icon"><Icon name="shield" size={25}/></div>
            <strong>{owned.length}</strong>
            <span>Owned Documents</span>
          </div>

          <div className="stat-card stat-red">
            <div className="stat-icon"><Icon name="users" size={25}/></div>
            <strong>{shared.length}</strong>
            <span>Shared With Me</span>
          </div>

          <div className="stat-card stat-gold">
            <div className="stat-icon"><Icon name="lock" size={25}/></div>
            <strong className="stat-word">
              {user.role.toUpperCase()}
            </strong>
            <span>Your Account Role</span>
          </div>
        </section>

        {user.role === "owner" && (
          <section className="content-panel" id="upload">
            <div className="section-heading">
              <span className="heading-icon"><Icon name="upload"/></span>
              <div>
                <h2>Upload Document</h2>
                <p>Add a file to your secure workspace</p>
              </div>
            </div>

            <form className="upload-form" onSubmit={upload}>
              <div className="file-picker">
                <Icon name="upload" size={27}/>
                <label htmlFor="file-upload">
                  {file ? file.name : "Choose a file to upload"}
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.txt,.png,.jpg,.jpeg"
                  onChange={(e) => setFile(e.target.files[0] || null)}
                  required
                />
                <small>PDF, TXT, PNG, JPG · Max 5 MB</small>
              </div>

              <div className="upload-fields">
                <label htmlFor="category">Category</label>
                <input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. college"
                />
                <button type="submit" disabled={busy}>
                  <Icon name="upload" size={18}/>
                  {busy ? "Uploading..." : "Upload File"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="content-panel" id="documents">
          <div className="section-heading documents-heading">
            <span className="heading-icon"><Icon name="files"/></span>
            <div>
              <h2>Your Documents</h2>
              <p>Find, download, and manage access to your files</p>
            </div>
          </div>

          <div className="table-toolbar">
            <div className="search-field">
              <Icon name="search" size={19}/>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents..."
                aria-label="Search documents"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter documents"
            >
              <option value="all">All documents</option>
              <option value="owned">Owned by me</option>
              <option value="shared">Shared with me</option>
            </select>

            <button className="refresh-btn" onClick={() =>
              loadDocuments().catch((e) => setMessage(e.message))
            }>
              Refresh
            </button>
          </div>

          <div className="table-scroll">
            <table className="documents-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Category</th>
                  <th>Access</th>
                  <th>Owner</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div className="file-cell">
                        <span className="file-icon">
                          <Icon name="files" size={21}/>
                        </span>
                        <strong>{doc.filename}</strong>
                      </div>
                    </td>

                    <td>
                      <span className="category-pill">
                        {doc.category || "general"}
                      </span>
                    </td>

                    <td>
                      <span className={
                        doc.access === "owner"
                          ? "access-pill access-owner"
                          : "access-pill access-shared"
                      }>
                        {doc.access}
                      </span>
                    </td>

                    <td>{doc.owner_name || "—"}</td>

                    <td>
                      <div className="table-actions">
                        <button
                          className="btn-download"
                          onClick={() => download(doc)}
                        >
                          <Icon name="download" size={15}/>
                          Download
                        </button>

                        {doc.access === "owner" && (
                          <>
                            <button
                              className="btn-grant"
                              onClick={() => grant(doc.id)}
                            >
                              <Icon name="plus" size={15}/>
                              Grant
                            </button>

                            <button
                              className="btn-revoke"
                              onClick={() => revoke(doc.id)}
                            >
                              Revoke
                            </button>

                            <button
                              className="btn-delete"
                              onClick={() => remove(doc.id)}
                              title="Delete document"
                              aria-label={`Delete ${doc.filename}`}
                            >
                              <Icon name="trash" size={16}/>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      <Icon name="files" size={34}/>
                      <p>No documents found.</p>
                      <small>
                        Try a different search or upload a document.
                      </small>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {user.role === "admin" && (
          <section className="content-panel" id="audit-logs">
            <div className="section-heading">
              <span className="heading-icon"><Icon name="clock" /></span>
              <div>
                <h2>Admin Audit Logs</h2>
                <p>Review recorded document activity and access decisions</p>
              </div>
            </div>

            <div className="table-toolbar">
              <span>Showing page {auditPage} of {Math.max(1, Math.ceil(auditTotal / 25))} · {auditTotal} records</span>
              <button className="refresh-btn" onClick={() => loadAuditLogs(auditPage)}>
                Refresh Audit Logs
              </button>
            </div>

            {auditError && <p className="message" role="alert">{auditError}</p>}

            <div className="table-scroll">
              <table className="documents-table">
                <thead>
                  <tr>
                    <th>Date &amp; Time</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Document ID</th>
                    <th>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.occurred_at).toLocaleString()}</td>
                      <td>{log.actor_email || log.actor_name || "Unknown"}</td>
                      <td><span className="category-pill">{log.action}</span></td>
                      <td>{log.document_id ?? "—"}</td>
                      <td>
                        <span className={log.outcome === "allowed"
                          ? "access-pill access-shared"
                          : "access-pill audit-denied"}>
                          {log.outcome}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr><td colSpan="5" className="empty-state">No audit records on this page.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-toolbar" style={{ marginTop: 16 }}>
              <button className="refresh-btn" disabled={auditPage <= 1}
                onClick={() => loadAuditLogs(auditPage - 1)}>Previous</button>
              <button className="refresh-btn" disabled={auditPage * 25 >= auditTotal}
                onClick={() => loadAuditLogs(auditPage + 1)}>Next</button>
            </div>
          </section>
        )}

        <section className="bottom-grid">
          <div className="content-panel">
            <div className="section-heading">
              <span className="heading-icon">
                <Icon name="shield"/>
              </span>
              <div>
                <h2>Access & Security</h2>
                <p>Keep your documents under control</p>
              </div>
            </div>

            <div className="security-list">
              <div>
                <Icon name="lock"/>
                <span>Documents require authorized access</span>
              </div>
              <div>
                <Icon name="users"/>
                <span>Owners can grant and revoke permissions</span>
              </div>
              <div>
                <Icon name="shield"/>
                <span>Your role: {user.role}</span>
              </div>
            </div>
          </div>

          <div className="content-panel">
            <div className="section-heading">
              <span className="heading-icon">
                <Icon name="clock"/>
              </span>
              <div>
                <h2>Quick Actions</h2>
                <p>Jump to your most-used tools</p>
              </div>
            </div>

            <div className="quick-actions">
              {user.role === "owner" && (
                <a className="quick-action quick-red" href="#upload">
                  <Icon name="upload" size={24}/>
                  <span>Upload File</span>
                </a>
              )}

              <a
                className="quick-action quick-blue"
                href="#documents"
                onClick={() => setFilter("all")}
              >
                <Icon name="files" size={24}/>
                <span>Browse Files</span>
              </a>

              <a
                className="quick-action quick-green"
                href="#documents"
                onClick={() => setFilter("shared")}
              >
                <Icon name="users" size={24}/>
                <span>Shared Files</span>
              </a>
            </div>
          </div>
        </section>

        <footer className="footer">
          <Icon name="shield" size={18}/>
          TrustVault · Secure Document Sharing
        </footer>
      </main>
    </div>
  );
}
