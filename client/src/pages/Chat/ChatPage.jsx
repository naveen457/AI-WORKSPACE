import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  sendChatMessage,
  getChatThreads,
  getThreadMessages,
  sendChatFeedback,
} from "../../api/chatService.js";
import { useAuth } from "../../context/AuthContext.jsx";

function formatTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function generateShaCode() {
  const chars = "0123456789abcdef";
  let hash = "";
  for (let i = 0; i < 8; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return `sha_${hash}`;
}

function ChatMessage({ message, onFeedback, feedbackState }) {
  const isUser = message.role === "user";
  const [showOptions, setShowOptions] = useState(false);
  const currentFeedback = feedbackState?.[message.id || message.createdAt];

  return (
    <div
      className={`group flex flex-col gap-1 max-w-[85%] md:max-w-[70%] ${
        isUser ? "ml-auto" : "mr-auto"
      }`}
    >
      <div
        className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm transition ${
          isUser
            ? "rounded-br-sm bg-[#eaa06d] text-white dark:bg-[#df925e]"
            : "rounded-bl-sm border border-gray-200/80 bg-gray-50/90 text-gray-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>

      <div
        className={`flex items-center gap-2 px-1 text-[11px] text-gray-400 dark:text-neutral-500 ${
          isUser ? "justify-end" : "justify-start"
        }`}
      >
        <span>{formatTime(message.createdAt)}</span>

        {!isUser && (
          <div className="ml-2 flex items-center gap-1.5 transition">
            <button
              type="button"
              onClick={() => onFeedback(message, "like")}
              title="Helpful response (+0.5 RL Reward)"
              className={`rounded p-1 transition hover:bg-gray-200 dark:hover:bg-neutral-800 ${
                currentFeedback === "p" || currentFeedback === "like"
                  ? "text-[#d47f4f] font-bold"
                  : "text-gray-400 hover:text-gray-700 dark:text-neutral-500 dark:hover:text-neutral-300"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowOptions(!showOptions);
                onFeedback(message, "dislike");
              }}
              title="Needs improvement (-0.6 RL Penalty)"
              className={`rounded p-1 transition hover:bg-gray-200 dark:hover:bg-neutral-800 ${
                currentFeedback && currentFeedback !== "p" && currentFeedback !== "like"
                  ? "text-red-500 font-bold"
                  : "text-gray-400 hover:text-gray-700 dark:text-neutral-500 dark:hover:text-neutral-300"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
              </svg>
            </button>

            {currentFeedback && (
              <span className="text-[10px] font-medium text-[#d47f4f]">
                {currentFeedback === "p" || currentFeedback === "like"
                  ? "✓ Feedback saved"
                  : `✓ Feedback saved (${currentFeedback})`}
              </span>
            )}
          </div>
        )}
      </div>

      {!isUser && showOptions && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[11px] text-gray-500 dark:text-neutral-400">RLHF Reason:</span>
          {[
            { label: "Too verbose", code: "over" },
            { label: "Missing info", code: "under" },
            { label: "Wrong answer", code: "n" },
          ].map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => {
                onFeedback(message, item.code);
                setShowOptions(false);
              }}
              className="rounded-full border border-gray-300 bg-white px-2.5 py-0.5 text-[11px] text-gray-600 transition hover:border-[#d47f4f] hover:text-[#d47f4f] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyChat({ onExample, activeSha }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center px-4 my-auto">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f7ece7] dark:bg-neutral-800">
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7 text-[#d47f4f]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-neutral-100">
          Adaptive Multi-Agent Workspace
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
          Active Thread: <span className="font-mono font-semibold text-[#d47f4f]">{activeSha}</span>
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 max-w-lg mt-2">
        {[
          "What can this adaptive system help me with?",
          "Plan and implement a python script",
          "Explain how the RL multi-agent architecture works",
        ].map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => onExample(example)}
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:border-[#d47f4f] hover:text-[#d47f4f] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(generateShaCode);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState(null);
  const [feedbackState, setFeedbackState] = useState({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    async function loadThreadCatalog() {
      try {
        const res = await getChatThreads();
        if (res.data?.threads && Array.isArray(res.data.threads)) {
          setThreads(res.data.threads);
        }
      } catch (err) {
        console.warn("Could not load threads catalog:", err);
      }
    }

    loadThreadCatalog();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  async function handleSelectThread(threadId) {
    if (threadId === activeThreadId) return;
    setActiveThreadId(threadId);
    setError(null);
    setIsLoadingHistory(true);

    try {
      const res = await getThreadMessages(threadId);
      if (res.data?.messages && Array.isArray(res.data.messages)) {
        const mapped = res.data.messages.map((m, idx) => ({
          id: `${threadId}_${idx}`,
          role: m.role || (m.type === "human" ? "user" : "assistant"),
          content: m.content || "",
          createdAt: new Date().toISOString(),
        }));
        setMessages(mapped);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.warn("Failed to load thread messages:", err);
      setMessages([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }

  function handleCreateNewThread() {
    const newSha = generateShaCode();
    setActiveThreadId(newSha);
    setMessages([]);
    setError(null);
    setInput("");
    inputRef.current?.focus();

    // Optimistically add to thread catalog
    setThreads((prev) => [
      {
        thread_id: newSha,
        message_count: 0,
        snippet: "New Conversation",
      },
      ...prev.filter((t) => t.thread_id !== newSha),
    ]);
  }

  async function send(messageText) {
    const trimmed = messageText.trim();
    if (!trimmed || isSending) return;

    const userMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);
    setError(null);

    // Update catalog snippet
    setThreads((prev) => {
      const existing = prev.find((t) => t.thread_id === activeThreadId);
      const updated = {
        thread_id: activeThreadId,
        message_count: (existing?.message_count || 0) + 1,
        snippet: trimmed.slice(0, 60),
      };
      return [updated, ...prev.filter((t) => t.thread_id !== activeThreadId)];
    });

    try {
      const response = await sendChatMessage({
        message: trimmed,
        conversationId: activeThreadId,
      });

      const assistantMessage = {
        id: `asst_${Date.now()}`,
        role: "assistant",
        content: response.data.message.content,
        createdAt: new Date().toISOString(),
        architectureVersion: response.data.architectureVersion,
        agentsInvoked: response.data.agentsInvoked,
        toolsExecuted: response.data.toolsExecuted,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Unable to connect to the AI service. Please make sure RL_Based_AMAS is running.";
      setError(message);
    } finally {
      setIsSending(false);
    }
  }

  async function handleFeedback(message, feedbackType) {
    const msgId = message.id || message.createdAt;
    setFeedbackState((prev) => ({
      ...prev,
      [msgId]: feedbackType,
    }));

    try {
      await sendChatFeedback({
        threadId: activeThreadId,
        feedback: feedbackType,
      });
    } catch (err) {
      console.warn("Feedback submission error:", err);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send(input);
    }
  }

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-gray-50/50 dark:bg-neutral-950">
      {/* ---------------- Left Sidebar Catalog ---------------- */}
      <aside
        className={`flex flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-neutral-800 dark:bg-neutral-900 ${
          isSidebarOpen ? "w-72 md:w-80" : "w-0 -translate-x-full md:w-0"
        } overflow-hidden`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-neutral-800">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-400">
            Chat Threads
          </span>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Collapse sidebar"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-300 md:hidden"
          >
            ✕
          </button>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={handleCreateNewThread}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#eaa06d] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#df925e]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {threads.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-gray-400 dark:text-neutral-500">
              No previous threads found.
            </div>
          ) : (
            threads.map((thread) => {
              const isActive = thread.thread_id === activeThreadId;
              return (
                <button
                  key={thread.thread_id}
                  type="button"
                  onClick={() => handleSelectThread(thread.thread_id)}
                  className={`group flex w-full flex-col gap-1 rounded-xl p-3 text-left transition ${
                    isActive
                      ? "border border-[#eaa06d]/40 bg-[#f7ece7]/80 dark:border-[#eaa06d]/30 dark:bg-neutral-800"
                      : "border border-transparent hover:bg-gray-100 dark:hover:bg-neutral-800/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold text-[#d47f4f]">
                      {thread.thread_id}
                    </span>
                    {thread.message_count !== undefined && (
                      <span className="rounded-full bg-gray-200/70 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-neutral-700 dark:text-neutral-300">
                        {thread.message_count} msgs
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-gray-700 dark:text-neutral-300">
                    {thread.snippet || "Empty conversation"}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ---------------- Main Chat Area ---------------- */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Chat Header Bar */}
        <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-900 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title={isSidebarOpen ? "Collapse catalog" : "Open catalog"}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
                  Thread SHA:
                </span>
                <span className="font-mono text-sm font-bold text-[#d47f4f]">
                  {activeThreadId}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateNewThread}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:border-[#eaa06d] hover:text-[#d47f4f] dark:border-neutral-700 dark:text-neutral-200"
          >
            <span>+</span>
            <span>New Chat</span>
          </button>
        </header>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-4">
          {isLoadingHistory ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-neutral-400">
                <div className="h-2 w-2 animate-pulse rounded-full bg-[#d47f4f]" />
                <span>Loading thread history...</span>
              </div>
            </div>
          ) : messages.length === 0 && !error && !isSending ? (
            <EmptyChat onExample={(text) => setInput(text)} activeSha={activeThreadId} />
          ) : (
            <>
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id || index}
                  message={message}
                  onFeedback={handleFeedback}
                  feedbackState={feedbackState}
                />
              ))}

              {isSending && (
                <div className="mr-auto flex flex-col gap-1 max-w-[85%] md:max-w-[70%]">
                  <div className="rounded-2xl rounded-bl-sm border border-gray-200/80 bg-gray-50 px-5 py-3.5 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-[#d47f4f]" />
                      <span className="text-gray-500 dark:text-neutral-400">
                        Reasoning with Adaptive Multi-Agent System...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400">
                  <div className="font-bold">Error Processing Message</div>
                  <div className="mt-1">{error}</div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Form */}
        <div className="border-t border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950 md:px-8">
          <form
            className="flex gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything... (Enter to send, Shift + Enter for newline)"
              rows={1}
              disabled={isSending}
              className="flex-1 resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#e89a63] focus:ring-1 focus:ring-[#e89a63] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="shrink-0 rounded-xl bg-[#eaa06d] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#df925e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSending ? "Thinking..." : "Send"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
