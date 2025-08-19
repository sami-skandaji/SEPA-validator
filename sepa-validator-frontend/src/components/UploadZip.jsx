import React, { useState } from "react";
import axiosInstance from "../axiosInstance";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const UploadZIP = () => {
  const { t } = useTranslation();
  const [zipFile, setZipFile] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!zipFile) return;

    const formData = new FormData();
    formData.append("zip_file", zipFile);

    try {
      const res = await axiosInstance.post("/api/upload-zip/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResults(res.data.files);  // 👈 On stocke tous les fichiers validés
      setError("");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Erreur lors de l'upload.");
      setResults([]);
    }
  };

  return (
    <div className="card mt-5 shadow p-4">
      <h5>{t("upload.upload_zip_title")}</h5>
      <div className="input-group mb-3">
        <input
          type="file"
          className="form-control"
          accept=".zip"
          onChange={(e) => setZipFile(e.target.files[0])}
        />
        <button className="btn btn-primary" onClick={handleUpload}>
          {t("upload.validate")}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {results.length > 0 && (
        <div className="alert alert-info">
          <h6>{t("upload.validation_results")}</h6>
          <ul className="list-group">
            {results.map((file, index) => (
              <li
                key={index}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <span>
                  {file.filename}{" "}
                  {file.is_valid ? "✅" : "❌"}
                </span>
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => navigate(`/sepa/${file.id}`)}
                >
                  {t("upload.view_report")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default UploadZIP;
