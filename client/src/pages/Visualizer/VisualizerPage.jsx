import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getChatThreads, getThreadGraph, getUserMetrics } from "../../api/chatService.js";

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

function MetricKpiCard({ title, value, subtitle, icon, badge, accent = "text-[#b8663b] dark:text-[#eaa06d]" }) {
  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-400">
          {title}
        </span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-base dark:bg-neutral-900 ${accent}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-neutral-100">
            {value}
          </span>
          {badge && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

const AGENT_COLORS = {
  planner: "bg-indigo-500 text-indigo-100",
  researcher: "bg-blue-500 text-blue-100",
  coder: "bg-emerald-500 text-emerald-100",
  critic: "bg-amber-500 text-amber-100",
  tool_executor: "bg-rose-500 text-rose-100",
  finalizer: "bg-teal-500 text-teal-100",
};

export default function VisualizerPage() {
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState("");
  const [filterByThread, setFilterByThread] = useState(false);
  const [graphImage, setGraphImage] = useState(null);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Load threads for the authenticated user
  const loadThreads = useCallback(async () => {
    try {
      const res = await getChatThreads();
      const list = res.data?.threads || [];
      setThreads(list);
      if (list.length > 0 && !selectedThread) {
        setSelectedThread(list[0].thread_id);
      }
    } catch (err) {
      console.warn("Unable to load user threads:", err.message);
    }
  }, [selectedThread]);

  // Load metrics strictly for the authenticated user
  const loadUserMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const threadToFilter = filterByThread && selectedThread ? selectedThread : null;
      const res = await getUserMetrics(threadToFilter);
      const metricsData = res.data?.data || res.data || null;
      setMetrics(metricsData);
    } catch (err) {
      console.warn("Unable to load user metrics:", err.message);
      setMetrics(null);
    } finally {
      setLoadingMetrics(false);
    }
  }, [filterByThread, selectedThread]);

  // Load graph image for selected thread
  const loadGraph = useCallback(async () => {
    if (!selectedThread) {
      setGraphImage(null);
      return;
    }
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
  }, [selectedThread]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  useEffect(() => {
    loadUserMetrics();
  }, [loadUserMetrics]);

  const summary = metrics?.summary || {
    total_runs: 0,
    total_tokens: 0,
    total_cost_usd: 0,
    avg_coverage: 0,
    avg_net_utility: 0,
    avg_critical_path: 0,
    avg_reward: 0,
  };

  const agentInvocations = metrics?.agent_invocations || {};
  const totalAgentCalls = Object.values(agentInvocations).reduce((acc, v) => acc + (v || 0), 0);
  const complexityBreakdown = metrics?.complexity_breakdown || {};
  const runs = metrics?.runs || [];

  return (
    <div className="flex flex-col items-center justify-start gap-8 px-4 py-10 md:px-8 lg:px-12">
      {/* Header & Isolation Badge */}
      <div className="max-w-3xl w-full text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-50/80 px-3.5 py-1 text-xs font-semibold text-emerald-800 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300">
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z"
              clipRule="evenodd"
            />
          </svg>
          User-Isolated Metrics • Account Scoped
        </div>
        <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-neutral-100">
          Adaptive Architecture & User Metrics
        </h1>
        <p className="mt-3 text-base text-gray-600 dark:text-neutral-300">
          Real-time performance metrics, token costs, capability alignment, and dynamic interaction graphs generated exclusively for your requests.
        </p>
      </div>

      {/* Filter & Controls Toolbar */}
      <div className="flex w-full max-w-4xl flex-col items-stretch justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <label htmlFor="thread-select" className="text-xs font-bold text-gray-500 dark:text-neutral-400 pl-1">
            Thread:
          </label>
          {threads.length > 0 ? (
            <select
              id="thread-select"
              value={selectedThread}
              onChange={(e) => setSelectedThread(e.target.value)}
              className="flex-1 min-w-[200px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#e89a63] dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
            >
              {threads.map((t) => (
                <option key={t.thread_id} value={t.thread_id}>
                  {t.thread_id} — {t.snippet ? t.snippet.slice(0, 36) : "New Thread"} ({t.message_count} msgs)
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-gray-500 dark:text-neutral-400">No active threads yet</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFilterByThread((prev) => !prev)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              filterByThread
                ? "bg-[#eaa06d] text-white shadow-sm"
                : "border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            }`}
          >
            {filterByThread ? "Filtered to Thread" : "All My Threads"}
          </button>

          <button
            type="button"
            onClick={() => {
              loadUserMetrics();
              loadGraph();
            }}
            title="Refresh metrics and graph"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <svg
              className={`h-3.5 w-3.5 ${loadingMetrics || loadingGraph ? "animate-spin text-[#eaa06d]" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 11-9-9c2.52 0 4.8 1.04 6.44 2.73L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricKpiCard
          title="Tasks Executed"
          value={loadingMetrics ? "..." : summary.total_runs}
          subtitle={filterByThread ? "In this conversation" : "Across your account"}
          badge={summary.total_runs > 0 ? "Active" : "Ready"}
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          }
        />

        <MetricKpiCard
          title="Tokens & Cost"
          value={loadingMetrics ? "..." : `$${summary.total_cost_usd.toFixed(4)}`}
          subtitle={`${summary.total_tokens.toLocaleString()} total tokens consumed`}
          accent="text-emerald-600 dark:text-emerald-400"
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M7 15h0M2 10h20" />
            </svg>
          }
        />

        <MetricKpiCard
          title="Capability Coverage"
          value={loadingMetrics ? "..." : `${(summary.avg_coverage * 100).toFixed(1)}%`}
          subtitle="Intent to active agent alignment"
          badge={summary.avg_coverage >= 0.9 ? "High" : "Standard"}
          accent="text-blue-600 dark:text-blue-400"
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          }
        />

        <MetricKpiCard
          title="Pareto Net Utility"
          value={
            loadingMetrics
              ? "..."
              : `${summary.avg_net_utility > 0 ? "+" : ""}${summary.avg_net_utility.toFixed(2)}`
          }
          subtitle={`Avg Path: ${summary.avg_critical_path} hops`}
          accent="text-indigo-600 dark:text-indigo-400"
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
          }
        />
      </div>

      {/* Agent Invocation Breakdown & Query Complexity */}
      <div className="grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
        {/* Agent Invocation Breakdown */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-neutral-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-neutral-100">
              Agent Invocations for You
            </h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-neutral-800 dark:text-neutral-300">
              {totalAgentCalls} total calls
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {[
              { id: "planner", name: "Planner", desc: "Deconstructs intents into sub-tasks" },
              { id: "researcher", name: "Researcher", desc: "Retrieves literature & external info" },
              { id: "coder", name: "Coder", desc: "Synthesizes code & logic scripts" },
              { id: "critic", name: "Critic", desc: "Validates accuracy & flags defects" },
              { id: "tool_executor", name: "Tool Executor", desc: "Executes search & mathematical tools" },
              { id: "finalizer", name: "Finalizer", desc: "Synthesizes clean conversational response" },
            ].map((agent) => {
              const count = agentInvocations[agent.id] || 0;
              const pct = totalAgentCalls > 0 ? Math.round((count / totalAgentCalls) * 100) : 0;
              return (
                <div key={agent.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-800 dark:text-neutral-200">
                      {agent.name}
                    </span>
                    <span className="text-gray-500 dark:text-neutral-400">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-neutral-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        AGENT_COLORS[agent.id]?.split(" ")[0] || "bg-[#eaa06d]"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task Complexity & Optimization Summary */}
        <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-neutral-800">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-neutral-100">
                Task Classification Profile
              </h2>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                Dynamic Routing
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: "Simple", count: complexityBreakdown.simple || 0, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
                { label: "Moderate", count: complexityBreakdown.moderate || 0, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" },
                { label: "Complex", count: complexityBreakdown.complex || 0, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/40" },
              ].map((tier) => (
                <div key={tier.label} className={`flex flex-col items-center rounded-xl p-3 text-center ${tier.color}`}>
                  <span className="text-lg font-bold">{tier.count}</span>
                  <span className="text-xs font-medium">{tier.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-2.5 rounded-xl border border-gray-100 bg-gray-50/60 p-4 text-xs text-gray-600 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-300">
              <div className="flex justify-between">
                <span>Avg Reinforcement Reward:</span>
                <span className="font-semibold text-gray-900 dark:text-neutral-100">
                  {summary.avg_reward > 0 ? `+${summary.avg_reward}` : summary.avg_reward}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Avg Critical Path Length:</span>
                <span className="font-semibold text-gray-900 dark:text-neutral-100">
                  {summary.avg_critical_path} hops
                </span>
              </div>
              <div className="flex justify-between">
                <span>Data Isolation Guarantee:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Strictly per user
                </span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-gray-400 dark:text-neutral-500 text-center">
            Q-learning policy adapts agent topologies based on your interaction rewards.
          </p>
        </div>
      </div>

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
              Showing latest graph topology synthesized for your thread and saved in MongoDB Atlas.
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

      {/* Recent Execution History Table for This User */}
      <div className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-neutral-800">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-neutral-100">
              Recent Execution Runs
            </h2>
            <p className="text-xs text-gray-500 dark:text-neutral-400">
              Detailed step history and cost profile for your queries
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-500 dark:text-neutral-400">
            {runs.length} runs recorded
          </span>
        </div>

        {runs.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500 dark:text-neutral-400">
              No tasks have been executed under your account yet. Ask a question in Chat to see metrics populated here!
            </p>
            <Link
              to="/chat"
              className="mt-3 inline-block rounded-full bg-[#eaa06d] px-4 py-1.5 text-xs font-bold text-white transition hover:bg-[#df925e]"
            >
              Start Chat
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:border-neutral-800 dark:text-neutral-500">
                <tr>
                  <th className="py-2.5 pr-3">Step</th>
                  <th className="py-2.5 px-3">Task Query</th>
                  <th className="py-2.5 px-3">Complexity</th>
                  <th className="py-2.5 px-3">Invoked Agents</th>
                  <th className="py-2.5 px-3 text-right">Tokens</th>
                  <th className="py-2.5 px-3 text-right">Cost</th>
                  <th className="py-2.5 pl-3 text-right">Coverage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {runs.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50/60 dark:hover:bg-neutral-900/60">
                    <td className="py-3 pr-3 font-semibold text-gray-900 dark:text-neutral-100">
                      #{r.step || i + 1}
                    </td>
                    <td className="py-3 px-3 max-w-[200px] truncate text-gray-700 dark:text-neutral-300 font-medium" title={r.task}>
                      {r.task}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          r.classification === "complex"
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                            : r.classification === "moderate"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        }`}
                      >
                        {r.classification || "simple"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {(r.invoked_agents || []).map((ag) => (
                          <span
                            key={ag}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              AGENT_COLORS[ag] || "bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300"
                            }`}
                          >
                            {ag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 dark:text-neutral-300 font-mono">
                      {r.estimated_tokens?.toLocaleString() || 0}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 dark:text-neutral-300 font-mono">
                      ${r.estimated_cost_usd ? r.estimated_cost_usd.toFixed(4) : "0.0000"}
                    </td>
                    <td className="py-3 pl-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {r.coverage_score !== undefined ? `${(r.coverage_score * 100).toFixed(0)}%` : "100%"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

