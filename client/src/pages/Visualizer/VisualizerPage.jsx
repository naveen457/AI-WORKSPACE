import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getChatThreads, getThreadGraph } from "../../api/chatService.js";

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
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState("");
  const [graphImage, setGraphImage] = useState(null);
  const [loadingGraph, setLoadingGraph] = useState(false);

  useEffect(() => {
    async function loadThreads() {
      try {
        const res = await getChatThreads();
        const list = res.data?.threads || [];
        setThreads(list);
        if (list.length > 0) {
          setSelectedThread(list[0].thread_id);
        }
      } catch (err) {
        console.warn("Unable to load threads:", err.message);
      }
    }
    loadThreads();
  }, []);

  useEffect(() => {
    if (!selectedThread) {
      setGraphImage(null);
      return;
    }

    async function loadGraph() {
      setLoadingGraph(true);
      try {
        const res = await getThreadGraph(selectedThread);
        setGraphImage(res.data?.graph || null);
      } catch (err) {
        console.warn("Unable to load thread graph:", err.message);
        setGraphImage(null);
      } finally {
        setLoadingGraph(false);
      }
    }

    loadGraph();
  }, [selectedThread]);

  return (
    <div className="flex flex-col items-center justify-start gap-8 px-4 py-10 md:px-8 lg:px-12">
      <div className="max-w-3xl w-full text-center">
        <span className="inline-block rounded-full bg-[#f7ece7] px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#b8663b] dark:bg-neutral-800 dark:text-[#eaa06d]">
          RL Multi-Agent Graph
        </span>
        <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-neutral-100">
          Architecture Visualizer
        </h1>
        <p className="mt-3 text-base text-gray-600 dark:text-neutral-300">
          Inspect the dynamic multi-agent interaction topology adapted by the Q-learning policy for your conversation threads.
        </p>
      </div>

      {/* Thread Selector */}
      {threads.length > 0 && (
        <div className="flex w-full max-w-xl items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <label htmlFor="thread-select" className="text-xs font-bold text-gray-500 dark:text-neutral-400 pl-2">
            Thread:
          </label>
          <select
            id="thread-select"
            value={selectedThread}
            onChange={(e) => setSelectedThread(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#e89a63] dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          >
            {threads.map((t) => (
              <option key={t.thread_id} value={t.thread_id}>
                {t.thread_id} — {t.snippet ? t.snippet.slice(0, 40) : "New Thread"} ({t.message_count} msgs)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Live Rendered Topology from MongoDB */}
      <div className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-md dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-base font-bold text-gray-900 dark:text-neutral-100">
              Live Adapted Interaction Flow {selectedThread ? `(${selectedThread})` : ""}
            </h2>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            Stored in MongoDB
          </span>
        </div>

        {loadingGraph ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e89a63] border-t-transparent" />
          </div>
        ) : graphImage ? (
          <div className="flex flex-col items-center justify-center p-4">
            <img
              src={graphImage}
              alt="Adaptive Multi-Agent Interaction Topology"
              className="max-h-[500px] w-auto rounded-xl border border-gray-200 bg-white object-contain p-2 shadow-inner dark:border-neutral-800 dark:bg-neutral-900"
            />
            <p className="mt-3 text-xs text-gray-500 dark:text-neutral-400">
              Showing latest graph topology synthesized for this thread and saved in MongoDB Atlas.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg
              viewBox="0 0 24 24"
              className="h-12 w-12 text-gray-300 dark:text-neutral-600 mb-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
            <p className="text-sm font-medium text-gray-600 dark:text-neutral-400">
              {threads.length === 0
                ? "No chat threads found. Start a chat first to generate an adaptive graph."
                : "No graph has been generated for this thread yet. Send a message to synthesize the topology!"}
            </p>
            <Link
              to="/chat"
              className="mt-4 rounded-full bg-[#eaa06d] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#df925e]"
            >
              Go to Chat
            </Link>
          </div>
        )}
      </div>

      {/* Comparison Overview */}
      <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
        <ArchitectureCard
          title="Fixed Pipeline Architecture"
          accent="text-[#d47f4f]"
          steps={[
            "Planner (Deconstructs intent into sub-goals)",
            "Researcher (Gathers information if needed)",
            "Coder (Generates implementation if needed)",
            "Critic (Validates correctness with feedback loops)",
            "Finalizer (Synthesizes clean user response)",
          ]}
        />

        <ArchitectureCard
          title="Adaptive Dynamic Architecture"
          accent="text-[#2563eb]"
          steps={[
            "RL Policy Controller (State encoder & Q-table)",
            "Dynamic Agent Pool (Context-driven invocation)",
            "Bypassed Bloat Pruning (Cost & latency optimization)",
            "Tool Execution Hooks (Calculators, retrievers, search)",
            "Dual-Objective Reward (Coverage vs surplus penalty)",
          ]}
        />
      </div>
    </div>
  );
}
