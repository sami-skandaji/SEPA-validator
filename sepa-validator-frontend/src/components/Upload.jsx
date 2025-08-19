import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../axiosInstance";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTranslation } from "react-i18next";
import "../assets/styles.css";
import UploadFromURL from "../pages/UploadFromURL";
import UploadZIP from "./UploadZip";

const Upload = () => {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [xmlContent, setXmlContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setError("");

    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setXmlContent(event.target.result);
      };
      reader.readAsText(selectedFile);
    } else {
      setXmlContent("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError(t("upload.error_no_file"));
      return;
    }

    const formData = new FormData();
    formData.append("xml_file", file);
    setIsUploading(true);
    setError("");

    try {
      const res = await axiosInstance.post("/api/upload/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      navigate(`/sepa/${res.data.id}`);
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail ||
        err.response?.data?.xml_file?.[0] ||
        t("upload.error_unknown");
      setError(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="text-end mb-3">
      </div>
      <div className="card shadow p-4">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="xmlFile" className="form-label fw-semibold">
              {t("upload.label_select_file")}
            </label>
            <input
              type="file"
              className="form-control"
              id="xmlFile"
              accept=".xml"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>

          {file && (
            <div className="alert alert-info py-2">
              {t("upload.selected_file")} <strong>{file.name}</strong>
            </div>
          )}

          {xmlContent && (
            <div className="mb-3">
              <label className="form-label fw-semibold">
                {t("upload.label_preview")}
              </label>
              <div className="border rounded p-3 bg-dark text-light" style={{ maxHeight: "400px", overflowY: "auto" }}>
                <SyntaxHighlighter language="xml" style={atomDark} showLineNumbers wrapLongLines>
                  {xmlContent}
                </SyntaxHighlighter>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-danger mt-3" role="alert">
              {error}
            </div>
          )}

          <div className="d-grid gap-2">
            <button type="submit" className="btn btn-primary" disabled={isUploading}>
              {isUploading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {t("upload.sending")}
                </>
              ) : (
                t("upload.submit")
              )}
            </button>
          </div>
        </form>

        <UploadFromURL />
        <hr />
        <UploadZIP />
      </div>
    </div>
  );
};

export default Upload;
