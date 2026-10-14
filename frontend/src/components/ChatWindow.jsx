import { useEffect, useRef, useState } from "react";
import {
  FiFileText,
  FiMenu,
  FiPlus,
  FiRefreshCw,
  FiShield,
  FiSquare,
  FiX,
} from "react-icons/fi";

import {
  streamDocumentChat,
  streamMessage,
} from "../services/api";

import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";
import FileUpload from "./FileUpload";
import WelcomeScreen from "./WelcomeScreen";

function ChatWindow({
  currentChat,
  updateCurrentChat,
  onOpenSidebar,
  onNewChat,
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [streamingText, setStreamingText] = useState("");

  const abortRef = useRef(null);
  const endRef = useRef(null);

  const messages = currentChat?.messages || [];
  const documentUploaded = Boolean(
    currentChat?.documentUploaded
  );

  // ----------------------------
  // Auto Scroll
  // ----------------------------
  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length, streamingText, busy]);

  // ----------------------------
  // Stop Request On Unmount
  // ----------------------------
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // ----------------------------
  // Send Message
  // ----------------------------
  const sendMessage = async (text) => {
    if (!currentChat || !text.trim() || busy) return;

    const cleanText = text.trim();

    const chatId = currentChat.id;

    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const nextTitle =
      currentChat.title === "New Chat"
        ? cleanText.slice(0, 42) +
          (cleanText.length > 42 ? "…" : "")
        : currentChat.title;

    const userMessage = {
      sender: "user",
      text: cleanText,
      time: now,
    };

    const aiMessage = {
      sender: "ai",
      text: "",
      time: "",
    };

    const baseMessages = [
      ...messages,
      userMessage,
      aiMessage,
    ];

    updateCurrentChat({
      title: nextTitle,
      messages: baseMessages,
    });

    setBusy(true);
    setStreamingText("");

    const controller = new AbortController();

    abortRef.current = controller;

    let accumulated = "";

    // ----------------------------
    // Update Streaming Response
    // ----------------------------
    const updateStream = (chunk) => {
      accumulated += chunk;

      setStreamingText(accumulated);

      updateCurrentChat({
        title: nextTitle,
        messages: [
          ...messages,
          userMessage,
          {
            ...aiMessage,
            text: accumulated,
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ],
      });
    };

    try {
      if (documentUploaded) {
        await streamDocumentChat(
          cleanText,
          chatId,
          {
            signal: controller.signal,
            onChunk: updateStream,
          }
        );
      } else {
        await streamMessage(
          cleanText,
          chatId,
          {
            signal: controller.signal,
            onChunk: updateStream,
          }
        );
      }

    } catch (error) {

      if (error?.name === "AbortError") {

        if (!accumulated) {
          updateCurrentChat({
            messages: [
              ...messages,
              userMessage,
            ],
          });
        }

      } else {

        const message =
          accumulated ||
          `I couldn't reach the CyberAI backend. ${
            error?.message ||
            "Please check that FastAPI is running at http://127.0.0.1:8000."
          }`;

        updateCurrentChat({
          messages: [
            ...messages,
            userMessage,
            {
              ...aiMessage,
              text: message,
              time: "Error",
            },
          ],
        });
      }

    } finally {

      abortRef.current = null;

      setBusy(false);

      setStreamingText("");
    }
  };

  // ----------------------------
  // Stop Generation
  // ----------------------------
  const stopGeneration = () => {
    abortRef.current?.abort();
  };

  // ----------------------------
  // Upload Success
  // ----------------------------
  const uploadSuccess = (
    file,
    analysis
  ) => {
    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    updateCurrentChat({
      documentUploaded: true,
      messages: [
        ...messages,

        {
          sender: "user",
          text: `Uploaded ${file.name}`,
          time: now,
        },

        {
          sender: "ai",
          text: `### Document analysis

${analysis}

**Document context is now active for this conversation.**`,
          time: now,
        },
      ],
    });

    setUploadOpen(false);
  };

  return (
    <main className="chat-area">

      {/* Top Bar */}
      <header className="topbar">

        <div className="topbar-left">

          <button
            className="icon-btn mobile-menu"
            onClick={onOpenSidebar}
          >
            <FiMenu />
          </button>

          <div className="secure-badge">
            <span className="status-pulse" />
            Secure session
          </div>

          <span className="topbar-separator">
            /
          </span>

          <strong>
            {currentChat?.title ||
              "New chat"}
          </strong>

        </div>

        <div className="topbar-actions">

          <div className="model-pill">
            <FiShield />
            Gemini
            <span>3.8 Flash</span>
          </div>

          <button
            className="icon-btn"
            onClick={() =>
              currentChat &&
              updateCurrentChat({
                messages: [],
                documentUploaded: false,
              })
            }
            title="Reset conversation"
          >
            <FiRefreshCw />
          </button>

          <button
            className="new-top-btn"
            onClick={onNewChat}
          >
            <FiPlus />
            New chat
          </button>

        </div>

      </header>

      {/* Chat Area */}
      <div className="chat-scroll">

        {messages.length === 0 ? (

          <WelcomeScreen
            onPromptClick={sendMessage}
            onUpload={() =>
              setUploadOpen(true)
            }
          />

        ) : (

          <div className="conversation">

            <div className="conversation-intro">

              <div className="intro-icon">
                <FiShield />
              </div>

              <div>
                <strong>
                  CyberAI is ready
                </strong>

                <span>
                  Ask a question or continue your
                  security investigation.
                </span>
              </div>

              {documentUploaded && (

                <div className="document-context">
                  <FiFileText />
                  Document context active
                </div>

              )}

            </div>

            {messages.map(
              (msg, index) => (

                <ChatMessage
                  key={`${currentChat.id}-${index}`}
                  msg={msg}
                />

              )
            )}

            {busy && (

              <div className="streaming-status">

                <div className="thinking-avatar">
                  <FiShield />
                </div>

                <div>
                  <strong>
                    CyberAI is generating
                  </strong>

                  <span>
                    Response is streaming in real time…
                  </span>
                </div>

                <button
                  className="stop-inline"
                  onClick={stopGeneration}
                >
                  <FiSquare />
                  Stop
                </button>

              </div>

            )}

            <div ref={endRef} />

          </div>

        )}

      </div>

      {/* Chat Input */}
      <ChatInput
        sendMessage={sendMessage}
        onUpload={() => setUploadOpen(true)}
        busy={busy}
        onStop={stopGeneration}
      />

      {/* Upload Modal */}
      {uploadOpen && (

        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget
            ) {
              setUploadOpen(false);
            }
          }}
        >

          <div className="upload-modal">

            <div className="modal-head">

              <div>

                <span className="eyebrow">
                  DOCUMENT INTELLIGENCE
                </span>

                <h2>
                  Analyze a security document
                </h2>

                <p>
                  CyberAI will extract the text,
                  summarize key concepts, and keep
                  the document available for
                  follow-up questions.
                </p>

              </div>

              <button
                className="icon-btn"
                onClick={() =>
                  setUploadOpen(false)
                }
              >
                <FiX />
              </button>

            </div>

            <FileUpload
              chatId={currentChat?.id}
              onUploadSuccess={uploadSuccess}
            />

          </div>

        </div>

      )}

    </main>
  );
}

export default ChatWindow;