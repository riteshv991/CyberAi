import { FiShield, FiUser } from "react-icons/fi";
export default function Avatar({ sender }) { return <div className={`message-avatar ${sender === "user" ? "user-avatar" : "ai-avatar"}`}>{sender === "user" ? <FiUser /> : <FiShield />}</div>; }
