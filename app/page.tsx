import { NoteAnalyzer } from "@/components/NoteAnalyzer";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
          DocGuard AI
        </h1>
        <p className="mt-2 text-lg text-slate-400">
          Real-time clinical documentation validator for MDD. Flag missing
          components before the note is locked.
        </p>
      </header>

      <div className="rounded-xl border border-navy-700 bg-navy-900/40 p-6 shadow-xl">
        <NoteAnalyzer />
      </div>

      <footer className="mt-12 text-center text-sm text-slate-500">
        MDD MVP — Major Depressive Disorder validation. Chrome extension
        available for inline EHR validation.
      </footer>
    </main>
  );
}
