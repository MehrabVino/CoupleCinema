import { promises as fs } from "fs";
import path from "path";
import { MODULES } from "@/lib/modules";

async function loadReadmePreview() {
  try {
    const readmePath = path.join(process.cwd(), "README.md");
    const content = await fs.readFile(readmePath, "utf8");
    return content.split("\n").slice(0, 80).join("\n");
  } catch {
    return "README.md not found.";
  }
}

export default async function ContactPage() {
  const readmePreview = await loadReadmePreview();

  return (
    <main className="container contact-page">
      <section className="hero">
        <p className="eyebrow">Contact Together</p>
        <h1>Platform info and docs</h1>
        <p>Everything about Together Space in one panel.</p>
      </section>

      <section className="grid contact-grid">
        <article className="card">
          <h2>Creator</h2>
          <p>Vino Development Team (Software Engineering)</p>
          <p className="muted">Build focus: chat-first collaboration with meet, files, and watch rooms.</p>
        </article>

        <article className="card">
          <h2>Apps</h2>
          <div className="contact-list">
            {MODULES.map((module) => (
              <div key={module.slug}>
                <strong>{module.title}</strong>
                <p className="muted">{module.description}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <h2>Docs</h2>
          <div className="contact-list">
            <div>
              <strong>Project Overview</strong>
              <p className="muted">README.md</p>
            </div>
            <div>
              <strong>User Guide</strong>
              <p className="muted">docs/USER_GUIDE.md</p>
            </div>
            <div>
              <strong>Developer Guide</strong>
              <p className="muted">docs/DEVELOPER_GUIDE.md</p>
            </div>
            <div>
              <strong>Architecture</strong>
              <p className="muted">docs/ARCHITECTURE.md</p>
            </div>
            <div>
              <strong>API and Events</strong>
              <p className="muted">docs/API_AND_EVENTS.md</p>
            </div>
            <div>
              <strong>Contributing</strong>
              <p className="muted">CONTRIBUTING.md</p>
            </div>
            <div>
              <strong>Security Policy</strong>
              <p className="muted">SECURITY.md</p>
            </div>
            <div>
              <strong>Code of Conduct</strong>
              <p className="muted">CODE_OF_CONDUCT.md</p>
            </div>
            <div>
              <strong>Bug Report Template</strong>
              <p className="muted">.github/ISSUE_TEMPLATE/bug_report.md</p>
            </div>
            <div>
              <strong>Feature Request Template</strong>
              <p className="muted">.github/ISSUE_TEMPLATE/feature_request.md</p>
            </div>
            <div>
              <strong>PR Template</strong>
              <p className="muted">.github/pull_request_template.md</p>
            </div>
          </div>
        </article>

        <article className="card contact-readme">
          <h2>README Preview</h2>
          <pre>{readmePreview}</pre>
        </article>
      </section>
    </main>
  );
}
