import { Link } from "react-router-dom";

function ArchitectureCard({ title, steps, accent }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <div className={`mb-4 flex items-center gap-2 text-sm font-bold ${accent}`}>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-current/15 text-sm">
          {title.charAt(0)}
        </span>
        {title}
      </div>
      <ul className="space-y-3">
        {steps.map((step, index) => (
          <li key={index} className="flex items-center gap-3 text-sm text-gray-700 dark:text-neutral-300">
            <span className="shrink-0 rounded-full bg-[#eaa06d] px-2 py-0.5 text-xs font-bold text-white">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function VisualizerPage() {
  return (
    <div className="flex flex-col items-center justify-start gap-6 px-4 py-10 md:px-8 lg:px-12">
      <div className="max-w-3xl w-full text-center">
        <span className="inline-block rounded-full bg-[#f7ece7] px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#b8663b] dark:bg-neutral-800 dark:text-[#eaa06d]">
          Placeholder
        </span>
        <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-neutral-100">
          Architecture Visualizer
        </h1>
        <p className="mt-3 text-base text-gray-600 dark:text-neutral-300">
          This section will eventually let you compare the fixed architecture with the adaptive
          RL-based architecture. It is not connected to the RL runtime yet.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ArchitectureCard
          title="Fixed Architecture"
          accent="text-[#d47f4f]"
          steps={[
            "Planner",
            "Researcher",
            "Coder",
            "Critic",
            "Finalizer",
          ]}
        />

        <ArchitectureCard
          title="Adaptive RL Architecture"
          accent="text-[#2563eb]"
          steps={[
            "RL Controller",
            "Agent Pool",
            "Architecture State",
            "Action Selection",
            "Dynamic Architecture",
          ]}
        />
      </div>

      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-neutral-700 dark:bg-neutral-900 md:max-w-2xl">
        <div className="flex flex-col items-center gap-3">
          <svg
            viewBox="0 0 24 24"
            className="h-12 w-12 text-gray-400 dark:text-neutral-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
          <p className="text-sm font-medium text-gray-600 dark:text-neutral-400">
            Interactive RL architecture visualization will be implemented here later.
          </p>
          <Link
            to="/chat"
            className="rounded-full bg-[#eaa06d] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#df925e]"
          >
            Back to Chat
          </Link>
        </div>
      </div>
    </div>
  );
}
