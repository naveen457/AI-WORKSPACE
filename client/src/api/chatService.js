import api from "./api.js";

export function sendChatMessage({ message, conversationId }) {
  return api.post("/chat", {
    message,
    conversationId,
  });
}

export default { sendChatMessage };
