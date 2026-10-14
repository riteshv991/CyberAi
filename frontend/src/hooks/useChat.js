
import { useCallback, useEffect, useMemo, useState } from "react";
import { createChat, getChats, saveChats } from "../utils/chatStorage";

function useChat() {
  // Create a fresh active chat on each app load while preserving history.
  const [initialState] = useState(() => {
    const storedChats = getChats();
    const freshChat = createChat();

    return {
      chats: [freshChat, ...storedChats],
      currentChatId: freshChat.id,
    };
  });

  const [chats, setChats] = useState(initialState.chats);
  const [currentChatId, setCurrentChatId] = useState(
    initialState.currentChatId
  );

  // Save conversation history without writing on every streaming chunk.
  useEffect(() => {
    const timer = window.setTimeout(() => saveChats(chats), 250);
    return () => window.clearTimeout(timer);
  }, [chats]);

  const currentChat = useMemo(
    () =>
      chats.find((chat) => chat.id === currentChatId) ||
      chats[0] ||
      null,
    [chats, currentChatId]
  );

  const newChat = useCallback(() => {
    const chat = createChat();
    setChats((prev) => [chat, ...prev]);
    setCurrentChatId(chat.id);
    return chat;
  }, []);

  const updateCurrentChat = useCallback(
    (patch) => {
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? {
                ...chat,
                ...patch,
                updatedAt: new Date().toISOString(),
              }
            : chat
        )
      );
    },
    [currentChatId]
  );

  const updateChat = useCallback((id, patch) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === id
          ? {
              ...chat,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : chat
      )
    );
  }, []);

  const deleteChat = useCallback(
    (id) => {
      setChats((prev) => {
        const next = prev.filter((chat) => chat.id !== id);

        if (!next.length) {
          const fresh = createChat();
          setCurrentChatId(fresh.id);
          return [fresh];
        }

        if (id === currentChatId) {
          setCurrentChatId(next[0].id);
        }

        return next;
      });
    },
    [currentChatId]
  );

  const clearHistory = useCallback(() => {
    const fresh = createChat();
    setChats([fresh]);
    setCurrentChatId(fresh.id);
  }, []);

  return {
    chats,
    currentChat,
    currentChatId,
    setCurrentChatId,
    newChat,
    updateCurrentChat,
    updateChat,
    deleteChat,
    clearHistory,
  };
}

export default useChat;
