import { motion } from "framer-motion";
import { FiArrowUpRight, FiBookOpen, FiCode, FiFileText, FiShield, FiTerminal, FiCrosshair } from "react-icons/fi";

const prompts = [
  { icon: FiCrosshair, label: "Threat hunting", text: "How would I investigate a suspicious PowerShell process on an endpoint?" },
  { icon: FiShield, label: "Web security", text: "Explain how to identify and mitigate SQL injection in a web application." },
  { icon: FiBookOpen, label: "SOC & interview prep", text: "Give me SOC analyst interview questions with strong sample answers." },
  { icon: FiTerminal, label: "Security tools", text: "Show me a practical Nmap workflow for an authorized assessment." },
  { icon: FiCode, label: "Secure coding", text: "Explain common authentication weaknesses and how to prevent them." },
  { icon: FiFileText, label: "Document analysis", text: "I want to upload a security document and ask questions about it." },
];

function WelcomeScreen({ onPromptClick, onUpload }) {
  return (
    <div className="welcome-screen">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="welcome-mark">
        <FiShield />
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .04 }}>
        How can I help you with <span>cybersecurity?</span>
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .08 }}>
        Ask about threats, vulnerabilities, SOC operations, security tools, cloud security, secure coding, or your own documents.
      </motion.p>

      <div className="prompt-grid">
        {prompts.map(({ icon: Icon, label, text }) => (
          <motion.button key={label} whileHover={{ y: -1 }} className="prompt-card" onClick={() => label === "Document analysis" ? onUpload() : onPromptClick(text)}>
            <span className="prompt-icon"><Icon /></span>
            <span className="prompt-copy"><small>{label}</small><strong>{text}</strong></span>
            <FiArrowUpRight className="prompt-arrow" />
          </motion.button>
        ))}
      </div>

      <button className="document-cta" onClick={onUpload}>
        <span><FiFileText /></span>
        <div><strong>Upload a document</strong><small>PDF, DOCX or TXT · analyze it and ask follow-up questions</small></div>
        <FiArrowUpRight />
      </button>
    </div>
  );
}

export default WelcomeScreen;
