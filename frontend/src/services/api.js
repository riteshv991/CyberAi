import axios from "axios";

const BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 180000,
});

async function readError(response) {
  const body = await response.text().catch(() => "");
  try {
    const parsed = JSON.parse(body);
    return parsed.detail || parsed.response || parsed.message || body;
  } catch {
    return body;
  }
}

export const sendMessage = async (message, chatId) =>
  (await API.post("/chat", { message, chat_id: chatId })).data;

export const streamMessage = async (message, chatId, { signal, onChunk } = {}) => {
  const response = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/plain" },
    body: JSON.stringify({ message, chat_id: chatId }),
    signal,
  });

  if (!response.ok) throw new Error(await readError(response) || `Request failed (${response.status})`);
  if (!response.body) throw new Error("Streaming is not supported by this browser.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text) onChunk?.(text);
  }
  const finalText = decoder.decode();
  if (finalText) onChunk?.(finalText);
};

export const uploadFile = async (file, chatId) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("chat_id", chatId);
  return (await API.post("/upload", formData)).data;
};

export const documentChat = async (message, chatId) =>
  (await API.post("/document-chat", { message, chat_id: chatId })).data;

export const streamDocumentChat = async (message, chatId, { signal, onChunk } = {}) => {
  const response = await fetch(`${BASE_URL}/document-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/plain" },
    body: JSON.stringify({ message, chat_id: chatId }),
    signal,
  });

  if (!response.ok) throw new Error(await readError(response) || `Request failed (${response.status})`);
  if (!response.body) throw new Error("Streaming is not supported by this browser.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text) onChunk?.(text);
  }
  const finalText = decoder.decode();
  if (finalText) onChunk?.(finalText);
};

export default API;
