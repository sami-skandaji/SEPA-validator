import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import "../assets/styles.css";

const Upload = () => {
  const [file, setFile] = useState(null);
  const [xmlContent, setXmlContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setError("");

    // Lire le contenu XML
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
      setError("Veuillez sélectionner un fichier XML.");
      return;
    }

    const formData = new FormData();
    formData.append("xml_file", file);
    setIsUploading(true);
    setError("");

    try {
      const res = await axios.post("http://localhost:8000/api/upload/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Token ${localStorage.getItem("token")}`,
        },
      });

      navigate(`/sepa/${res.data.id}`);
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail ||
        err.response?.data?.xml_file?.[0] ||
        "Erreur inconnue lors de la validation.";
      setError(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mt-5">
      <h2 className="text-center text-primary fw-bold mb-4">
        Validateur de fichiers SEPA
      </h2>

      <div className="card shadow p-4">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="xmlFile" className="form-label fw-semibold">
              Sélectionner un fichier XML :
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
              Fichier sélectionné : <strong>{file.name}</strong>
            </div>
          )}

          {xmlContent && (
            <div className="mb-3">
              <label className="form-label fw-semibold">Contenu XML :</label>
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
                  Envoi en cours...
                </>
              ) : (
                "Valider le fichier"
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <button className="btn btn-outline-secondary" onClick={() => navigate("/dashboard")}>
            ⬅ Retour au tableau de bord
          </button>
        </div>
      </div>
    </div>
  );
};

export default Upload;
