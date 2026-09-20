import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sendChatMessage } from "../../api/chatService.js";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("authUser")) || null;
  } catch {
    return null;
  }
}

function formatTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ChatMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex flex-col gap-1 max-w-[80%] md:max-w-[65%] ${
        isUser ? "ml-auto" : "mr-auto"
      }`}
    >
      <div
        className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "rounded-br-sm bg-[#eaa06d] text-white dark:bg-[#df925e]"
            : "rounded-bl-sm bg-gray-100 text-gray-900 dark:bg-neutral-800 dark:text-neutral-100"
        }`}
      >
        {message.content}
      </div>
      <div
        className={`text-[11px] text-gray-500 dark:text-neutral-400 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {formatTime(message.createdAt)}
      </div>
    </div>
  );
}

function EmptyChat({ onExample }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f7ece7] dark:bg-neutral-800">
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
          Start a conversation
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
          Ask a question or try an example to get started.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {[
          "What can this assistant help me with?",
          "Give me a short project plan",
          "Explain this in simple terms",
        ].map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => onExample(example)}
            className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition hover:border-[#d47f4f] hover:text-[#d47f4f] dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatLoading() {
  return (
    <div className="flex flex-col gap-1 max-w-[80%] md:max-w-[65%] mr-auto">
      <div className="rounded-xl rounded-bl-sm bg-gray-100 px-4 py-3 text-sm dark:bg-neutral-800">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-[#d47f4f]" />
          <span className="text-gray-500 dark:text-neutral-400">
            Thinking...
          </span>
        </div>
      </div>
    </div>
  );
}

function ChatError({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center px-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 text-red-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      </div>
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-neutral-100">
          Something went wrong
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
          {message}
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="rounded bg-[#eaa06d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#df925e]"
      >
        Try again
      </button>
    </div>
  );
}

export default function ChatPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken");

    if (!token) {
      navigate("/auth", { replace: true });
      return;
    }

    async function loadUser() {
      try {
        const api = (await import("../../api/api.js")).default;
        const response = await api.get("/auth/me");
        setUser(response.data.user);
        localStorage.setItem("authUser", JSON.stringify(response.data.user));
      } catch {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
      }
    }

    loadUser();
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function send(messageText) {
    const trimmed = messageText.trim();
    if (!trimmed || isSending) return;

    const userMessage = {
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);
    setError(null);

    try {
      const response = await sendChatMessage({
        message: trimmed,
        conversationId,
      });

      const assistant = {
        role: "assistant",
        content: response.data.message.content,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistant]);
      setConversationId(response.data.conversationId);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Unable to connect to the AI service. Please try again.";
      setError(message);
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send(input);
    }
  }

  function handleExample(example) {
    setInput(example);
    inputRef.current?.focus();
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex flex-1 flex-col overflow-hidden px-4 py-5 md:px-8 lg:px-12">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900 dark:text-neutral-100">
            Chat
          </h1>
          <div className="text-xs text-gray-500 dark:text-neutral-400">
            {messages.length > 0
              ? `${messages.length} message${messages.length === 1 ? "" : "s"}`
              : "No messages yet"}
          </div>
        </div>

        <div
          className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 md:p-6"
        >
          {messages.length === 0 && !error && !isSending ? (
            <EmptyChat onExample={handleExample} />
          ) : (
            <div className="flex flex-col overflow-y-auto">
              {messages.map((message, index) => (
                <ChatMessage key={index} message={message} />
              ))}
              {messages.length > 0 && <div ref={messagesEndRef} />}
            </div>
          )}

          {error && <ChatError message={error} onRetry={() => send(input)} />}
        </div>
      </div>

      <div className="border-t border-gray-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950 md:px-8 lg:px-12">
        <form
          className="flex gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Enter to send, Shift + Enter for new line)"
            rows={1}
            disabled={isSending}
            className="flex-1 resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#e89a63] focus:ring-1 focus:ring-[#e89a63] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="shrink-0 rounded-xl bg-[#eaa06d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#df925e] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
