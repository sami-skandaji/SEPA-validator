import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../assets/styles.css";

const Upload = () => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(""); // réinitialiser l'erreur si un nouveau fichier est choisi
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

      navigate("/upload/success", { state: { result: res.data } });
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
      <h2 className="mb-4 text-center"> Valider un fichier SEPA XML</h2>

      <div className="card shadow p-4">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="xmlFile" className="font-weight-bold">Fichier XML :</label>
            <input
              type="file"
              className="form-control-file"
              id="xmlFile"
              accept=".xml"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>

          {file && (
            <p className="mt-2 text-muted">
              ✅ Fichier sélectionné : <strong>{file.name}</strong>
            </p>
          )}

          {error && (
            <div className="alert alert-danger mt-3" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary mt-3" disabled={isUploading}>
            {isUploading ? (
              <>
                <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                Envoi en cours...
              </>
            ) : (
              "Valider"
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button className="btn btn-link" onClick={() => navigate("/dashboard")}>
             Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
};

export default Upload;
