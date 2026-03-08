import ModuleCard from "@/components/home/ModuleCard";
import { MODULES } from "@/lib/modules";

export default function HomePage() {
  return (
    <main className="container">
      <section className="hero">
        <p className="eyebrow">Together Space</p>
        <h1>One place for chat, calls, files, and watch rooms</h1>
        <p>Pick an app and start together.</p>
      </section>
      <section className="grid">
        {MODULES.map((module) => (
          <ModuleCard key={module.slug} {...module} />
        ))}
      </section>
    </main>
  );
}
