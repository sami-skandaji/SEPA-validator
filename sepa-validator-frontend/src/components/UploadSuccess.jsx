import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../assets/styles.css";

const UploadSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result;

  if (!result) {
    return (
      <div className="container mt-5 text-center">
        <h4>Aucune donnée de validation disponible.</h4>
        <button className="btn btn-secondary mt-3" onClick={() => navigate("/upload")}>
          Valider un fichier
        </button>
      </div>
    );
  }

  const isValid = result.is_valid;

  return (
    <div className="container mt-5">
      <div
        className={`card shadow p-4 border-4 ${isValid ? "border-success" : "border-danger"}`}
      >
        <h2 className="text-center mb-4">
          {isValid ? "✅ Fichier SEPA Valide" : "❌ Fichier SEPA Invalide"}
        </h2>

        <p><strong>Nom du fichier :</strong> {result.filename}</p>

        <p><strong>Validité :</strong>{" "}
          <span className={isValid ? "text-success font-weight-bold" : "text-danger font-weight-bold"}>
            {isValid ? "Oui" : "Non"}
          </span>
        </p>

        <div className="mt-3">
          <strong>Rapport de validation :</strong>
          <pre className="bg-light border p-3 mt-2 rounded" style={{ whiteSpace: "pre-wrap", maxHeight: "400px", overflowY: "auto" }}>
            {result.validation_report}
          </pre>
        </div>

        <div className="mt-4 d-flex justify-content-center gap-3">
          <button className="btn btn-primary mr-3" onClick={() => navigate("/upload")}>
            Valider un autre fichier
          </button>
          <button className="btn btn-secondary" onClick={() => navigate("/dashboard")}>
            Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadSuccess;
