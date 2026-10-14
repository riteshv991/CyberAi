import { useMemo, useState } from "react";
import {
  FiActivity, FiArchive, FiChevronLeft, FiClock, FiEdit3, FiMessageSquare,
  FiMoreHorizontal, FiPlus, FiSearch, FiShield, FiTrash2, FiX
} from "react-icons/fi";

function formatGroup(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = startToday - new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (diff === 0) return "Today";
  if (diff === 86400000) return "Yesterday";
  if (diff <= 7 * 86400000) return "Previous 7 days";
  return "Older";
}

function Sidebar({ chats, currentChatId, setCurrentChatId, newChat, updateChat, deleteChat, clearHistory, mobileOpen, onClose }) {
  const [query, setQuery] = useState("");
  const [menuId, setMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  const filtered = useMemo(() => chats
    .filter((chat) => chat.title.toLowerCase().includes(query.toLowerCase()) || chat.messages.some((m) => m.text?.toLowerCase().includes(query.toLowerCase())))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)), [chats, query]);

  const groups = useMemo(() => filtered.reduce((acc, chat) => {
    const key = formatGroup(chat.updatedAt);
    (acc[key] ||= []).push(chat);
    return acc;
  }, {}), [filtered]);

  const rename = (chat) => {
    setEditingId(chat.id);
    setEditValue(chat.title);
    setMenuId(null);
  };

  const commitRename = () => {
    if (editingId && editValue.trim()) updateChat(editingId, { title: editValue.trim() });
    setEditingId(null);
  };

  const renderChat = (chat) => (
    <div key={chat.id} className={`history-item ${currentChatId === chat.id ? "active" : ""}`}>
      <button className="history-main" onClick={() => { setCurrentChatId(chat.id); onClose?.(); }}>
        <span className="history-icon"><FiMessageSquare /></span>
        <span className="history-copy">
          {editingId === chat.id ? (
            <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={commitRename} onKeyDown={(e) => e.key === "Enter" && commitRename()} onClick={(e) => e.stopPropagation()} />
          ) : <strong>{chat.title}</strong>}
          <small>{chat.messages.length ? `${chat.messages.length} messages` : "Empty conversation"}</small>
        </span>
      </button>
      <button className="history-menu" onClick={() => setMenuId(menuId === chat.id ? null : chat.id)} aria-label="Chat options"><FiMoreHorizontal /></button>
      {menuId === chat.id && (
        <div className="chat-menu">
          <button onClick={() => rename(chat)}><FiEdit3 /> Rename</button>
          <button className="danger" onClick={() => { deleteChat(chat.id); setMenuId(null); }}><FiTrash2 /> Delete</button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {mobileOpen && <button className="sidebar-overlay" onClick={onClose} aria-label="Close sidebar" />}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><FiShield /></div>
          <div><div className="brand-name">Cyber<span>AI</span></div><div className="brand-sub">SECURITY INTELLIGENCE</div></div>
          <button className="mobile-close" onClick={onClose}><FiX /></button>
        </div>

        <button className="new-chat-btn" onClick={() => { newChat(); onClose?.(); }}><FiPlus /> New chat</button>

        <div className="sidebar-search">
          <FiSearch /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations" /><kbd>⌘K</kbd>
        </div>

        <div className="sidebar-section-label"><span>Workspace</span></div>
        <div className="workspace-card">
          <div className="workspace-icon"><FiActivity /></div>
          <div><strong>Cybersecurity Lab</strong><small>AI threat analysis enabled</small></div>
          <span className="live-dot" />
        </div>

        <div className="sidebar-section-label history-label"><span>Conversation history</span><span>{chats.length}</span></div>
        <div className="history-list">
          {Object.keys(groups).length ? Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <div className="history-group-title"><FiClock /> {group}</div>
              {items.map(renderChat)}
            </div>
          )) : <div className="empty-history"><FiArchive /><p>No conversations found</p><small>Try another search.</small></div>}
        </div>

        <div className="sidebar-footer">
          <div className="security-status"><span className="status-pulse" /><div><strong>System operational</strong><small>API connection ready</small></div></div>
          <button className="clear-history" onClick={() => { if (window.confirm("Clear all local chat history?")) clearHistory(); }}><FiTrash2 /> Clear history</button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
