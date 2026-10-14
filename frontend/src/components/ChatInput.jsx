import { useEffect, useRef, useState } from "react";
import { FiCommand, FiFilePlus, FiSend, FiSquare } from "react-icons/fi";
import { motion } from "framer-motion";

function ChatInput({ sendMessage, onUpload, busy, onStop }) {
  const [text, setText] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!busy) submit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const submit = () => {
    if (!text.trim() || busy) return;
    sendMessage(text.trim());
    setText("");
    if (ref.current) ref.current.style.height = "auto";
  };

  const change = (e) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  return <div className="composer-wrap">
    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`composer ${busy ? "composer-busy" : ""}`}>
      <button className="composer-tool" onClick={onUpload} title="Upload document" disabled={busy}><FiFilePlus /></button>
      <textarea ref={ref} rows="1" value={text} disabled={busy} onChange={change} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} placeholder={busy ? "CyberAI is generating a response…" : "Ask CyberAI about threats, vulnerabilities, tools, or security architecture…"} />
      <div className="composer-actions">
        {!busy && <span className="shortcut"><FiCommand /> Enter</span>}
        {busy ? <button className="stop-btn" onClick={onStop} title="Stop generating"><FiSquare /> Stop</button> : <button className="send-btn" onClick={submit} disabled={!text.trim()}><FiSend /></button>}
      </div>
    </motion.div>
    <div className="composer-note">{busy ? "Streaming response · You can stop generation at any time." : "CyberAI can make mistakes. Verify critical findings before acting. · Authorized security testing only."}</div>
  </div>;
}
export default ChatInput;
