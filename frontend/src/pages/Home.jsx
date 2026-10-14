import { useState } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import useChat from "../hooks/useChat";

function Home() {
  const chat = useChat();
  const [mobileSidebar, setMobileSidebar] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar
        {...chat}
        mobileOpen={mobileSidebar}
        onClose={() => setMobileSidebar(false)}
      />
      <ChatWindow
        currentChat={chat.currentChat}
        currentChatId={chat.currentChatId}
        updateCurrentChat={chat.updateCurrentChat}
        onOpenSidebar={() => setMobileSidebar(true)}
        onNewChat={chat.newChat}
      />
    </div>
  );
}

export default Home;
