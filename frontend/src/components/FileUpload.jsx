import { useRef, useState } from "react";
import {
  FiCheckCircle,
  FiFileText,
  FiLoader,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";

import { uploadFile } from "../services/api";

function FileUpload({
  chatId,
  onUploadSuccess,
  compact = false,
}) {
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ----------------------------
  // Select File
  // ----------------------------
  const choose = (e) => {
    const selected = e.target.files?.[0];

    if (!selected) return;

    setError("");
    setFile(selected);
  };

  // ----------------------------
  // Upload and Analyze Document
  // ----------------------------
  const upload = async () => {
    if (!file) return;

    if (!chatId) {
      setError("Unable to identify the current chat.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await uploadFile(file, chatId);

      console.log("Upload response:", result);

      // No response from backend
      if (!result) {
        throw new Error(
          "No response received from the backend."
        );
      }

      // Backend did not return analysis
      if (!result.response) {
        throw new Error(
          result.detail ||
          result.message ||
          "The backend did not return a document analysis."
        );
      }

      // Backend returned an error
      if (
        result.response.startsWith("Error") ||
        result.response.includes("Unsupported") ||
        result.response.includes("No readable text")
      ) {
        throw new Error(result.response);
      }

      // Successful analysis
      onUploadSuccess?.(
        file,
        result.response
      );

      // Clear selected file
      setFile(null);

      if (inputRef.current) {
        inputRef.current.value = "";
      }

    } catch (err) {

      console.error(
        "Document upload error:",
        err
      );

      setError(
        err.response?.data?.detail ||
        err.response?.data?.response ||
        err.message ||
        "Unable to analyze this document. Please try again."
      );

    } finally {

      setLoading(false);

    }
  };

  // ----------------------------
  // Remove File
  // ----------------------------
  const removeFile = () => {
    setFile(null);
    setError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div
      className={`upload-widget ${
        compact ? "compact" : ""
      }`}
    >

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.docx"
        hidden
        onChange={choose}
      />

      {/* No File Selected */}
      {!file ? (

        <button
          className="upload-dropzone"
          onClick={() =>
            inputRef.current?.click()
          }
        >

          <span className="upload-icon">
            <FiUploadCloud />
          </span>

          <span>

            <strong>
              Upload document
            </strong>

            <small>
              PDF, DOCX or TXT · up to 25 MB
            </small>

          </span>

        </button>

      ) : (

        /* File Selected */
        <div className="selected-file">

          <div className="file-meta">

            <span className="file-icon">
              <FiFileText />
            </span>

            <div>

              <strong>
                {file.name}
              </strong>

              <small>
                {(
                  file.size /
                  1024 /
                  1024
                ).toFixed(2)} MB
              </small>

            </div>

          </div>

          {/* Remove File */}
          <button
            onClick={removeFile}
            disabled={loading}
            title="Remove file"
          >
            <FiX />
          </button>

          {/* Analyze File */}
          <button
            className="upload-confirm"
            onClick={upload}
            disabled={loading}
          >

            {loading ? (

              <>
                <FiLoader className="spin" />
                Analyzing...
              </>

            ) : (

              <>
                <FiCheckCircle />
                Analyze
              </>

            )}

          </button>

        </div>

      )}

      {/* Error Message */}
      {error && (

        <div className="upload-error">
          {error}
        </div>

      )}

    </div>
  );
}

export default FileUpload;