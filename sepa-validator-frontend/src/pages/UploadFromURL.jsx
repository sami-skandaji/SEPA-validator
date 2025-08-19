import { useState } from "react";
import axiosInstance from "../axiosInstance";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";


function UploadFromURL() {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [report] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleValidateUrl = async () => {
  if (!url) return;

  try {
    const res = await axiosInstance.post("/api/upload-url/", { url });
    const fileId = res.data.id;

    if (fileId) {
      const token = localStorage.getItem("access"); // relit le token mis à jour
      if (token) {
        // injection manuelle si besoin (par sécurité)
        axiosInstance.defaults.headers["Authorization"] = `Bearer ${token}`;
        navigate(`/sepa/${fileId}`);
      } else {
        console.warn("Pas de token trouvé, redirection vers login.");
        navigate("/login");
      }
    } else {
      setError("ID de fichier non trouvé dans la réponse.");
    }
  } catch (err) {
    setError(err.response?.data?.error || "Une erreur est survenue.");
  }
};

  return (
    <div className="card mt-5 shadow p-4">
      <h5 className="mb-3">{t("upload.validate_by_url")}</h5>
      <div className="input-group mb-3">
        <input
          type="text"
          className="form-control"
          placeholder={t("upload.enter_file_url")}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button className="btn btn-primary" onClick={handleValidateUrl}>
          {t("upload.validate")}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {report && (
        <div className="alert alert-success">
          <p>
            ✅ {t("upload.sepa_version")}: <strong>{report.sepa_version}</strong>
          </p>
          <p>
            {t("upload.xsd_valid")}:{" "}
            <strong>{report.xsd_valid ? "✅" : "❌"}</strong>
          </p>
          <hr />
          <h6>{t("upload.report_title")}</h6>
          <ul>
            {Array.isArray(report?.report) &&
                report.report.map((line, index) => (
                    <li key={index}>{line}</li>
                ))}
            </ul>
        </div>
      )}
    </div>
  );
}

export default UploadFromURL;
