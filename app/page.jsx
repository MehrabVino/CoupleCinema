import ModuleCard from "@/components/home/ModuleCard";
import { MODULES } from "@/lib/modules";

export default function HomePage() {
  return (
    <main className="container">
      <section className="hero">
        <p className="eyebrow">CoupleCinema Platform</p>
        <h1>One Minimal Hub For Communication And Shared Time</h1>
        <p>
          Select a module to chat, meet, share files, or watch movies in sync.
        </p>
      </section>
      <section className="grid">
        {MODULES.map((module) => (
          <ModuleCard key={module.slug} {...module} />
        ))}
      </section>
    </main>
  );
}
