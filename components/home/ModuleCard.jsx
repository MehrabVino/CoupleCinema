import Link from "next/link";

export default function ModuleCard({ title, description, href, cta }) {
  return (
    <article className="card">
      <h2>{title}</h2>
      <p>{description}</p>
      <Link className="button" href={href}>
        {cta}
      </Link>
    </article>
  );
}
