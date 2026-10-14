import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FiCheck, FiCopy, FiShield, FiUser } from "react-icons/fi";
import { motion } from "framer-motion";

function ChatMessage({ msg }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.sender === "user";
  const copy = async () => {
    try { await navigator.clipboard.writeText(msg.text || ""); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`message-row ${isUser ? "user" : "assistant"}`}>
      <div className={`message-avatar ${isUser ? "user-avatar" : "ai-avatar"}`}>{isUser ? <FiUser /> : <FiShield />}</div>
      <div className="message-column">
        <div className="message-meta"><strong>{isUser ? "You" : "CyberAI"}</strong><span>{msg.time || "Now"}</span></div>
        <div className={`message-bubble ${isUser ? "user-bubble" : "ai-bubble"}`}>
          {isUser ? <p>{msg.text}</p> : <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
            h1: ({ children }) => <h1>{children}</h1>, h2: ({ children }) => <h2>{children}</h2>, h3: ({ children }) => <h3>{children}</h3>,
            p: ({ children }) => <p>{children}</p>, ul: ({ children }) => <ul>{children}</ul>, ol: ({ children }) => <ol>{children}</ol>, li: ({ children }) => <li>{children}</li>,
            blockquote: ({ children }) => <blockquote>{children}</blockquote>,
            code: ({ inline, className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || "");
              return !inline && match ? <SyntaxHighlighter language={match[1]} style={oneDark} PreTag="div" customStyle={{ borderRadius: 14, padding: 18, margin: "14px 0", fontSize: 13, background: "#07111f" }} {...props}>{String(children).replace(/\n$/, "")}</SyntaxHighlighter> : <code className="inline-code">{children}</code>;
            }
          }}>{msg.text}</ReactMarkdown>}
        </div>
        {!isUser && msg.text && !msg.loading && <button className="copy-btn" onClick={copy}>{copied ? <><FiCheck /> Copied</> : <><FiCopy /> Copy response</>}</button>}
      </div>
    </motion.div>
  );
}
export default memo(ChatMessage);
