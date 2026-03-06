import Link from "next/link";

export default function ExternalToolPage({ title, description, url, button }) {
  return (
    <main className="tool-wrap">
      <section className="tool-card">
        <p className="eyebrow">CoupleCinema Platform</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="row">
          <a className="button" href={url} target="_blank" rel="noreferrer">
            {button}
          </a>
          <Link className="button ghost" href="/">
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}
