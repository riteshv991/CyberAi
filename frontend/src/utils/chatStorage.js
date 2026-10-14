// Final build namespace. It intentionally does not read earlier CyberAI storage keys.
const STORAGE_KEY = "cyberai_chats_final_v1";

function normalizeChat(chat) {
  return {
    id: chat.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: chat.title || "New chat",
    messages: Array.isArray(chat.messages) ? chat.messages : [],
    createdAt: chat.createdAt || new Date().toISOString(),
    updatedAt: chat.updatedAt || chat.createdAt || new Date().toISOString(),
    documentUploaded: Boolean(chat.documentUploaded),
  };
}

export function getChats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeChat) : [];
  } catch {
    return [];
  }
}

export function saveChats(chats) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(chats)); } catch {}
}

export function createChat() {
  const now = new Date().toISOString();
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "New chat",
    messages: [],
    createdAt: now,
    updatedAt: now,
    documentUploaded: false,
  };
}
