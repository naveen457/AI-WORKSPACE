import api from "./api.js";

export function sendChatMessage({ message, conversationId }) {
  return api.post("/chat", {
    message,
    conversationId,
  });
}

export function getChatThreads() {
  return api.get("/chat/threads");
}

export function getThreadMessages(threadId) {
  return api.get(`/chat/threads/${encodeURIComponent(threadId)}`);
}

export function sendChatFeedback({ threadId, feedback, comment }) {
  return api.post("/chat/feedback", {
    threadId,
    feedback,
    comment,
  });
}

export function getThreadGraph(threadId) {
  return api.get(`/chat/threads/${encodeURIComponent(threadId)}/graph`);
}

export default {
  sendChatMessage,
  getChatThreads,
  getThreadMessages,
  getThreadGraph,
  sendChatFeedback,
};

