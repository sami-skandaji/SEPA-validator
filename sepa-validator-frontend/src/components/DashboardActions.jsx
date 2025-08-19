import React from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../axiosInstance";
import { useTranslation } from "react-i18next";

const DashboardActions = ({ username }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const handleUpdateVersions = async () => {
    const confirmed = window.confirm(t("dashboard.confirm_update_versions"));
    if (!confirmed) return;

    try {
      const res = await axiosInstance.post("/api/update-versions/", null);
      alert(t("dashboard.update_success", { count: res.data.updated }));
      window.location.reload();
    } catch (err) {
      alert(t("dashboard.update_error"));
      console.error(err);
    }
  };

  return (
    <div className="card shadow text-center mb-5 p-4">
      {/* ✅ Texte introductif */}
      <p className="lead">{t("dashboard.subtitle")}</p>

      {/* ✅ Boutons d’action */}
      <div className="d-flex flex-wrap justify-content-center gap-3 mt-4">
        <button
          className="btn btn-outline btn-lg text-dark border-dark"
          onClick={() => navigate("/upload")}
        >
          {t("dashboard.btn_validate")}
        </button>

        <button
          className="btn btn-outline btn-lg text-dark border-dark"
          onClick={() => navigate("/statistics")}
        >
          {t("dashboard.btn_statistics")}
        </button>

        <button
          className="btn btn-outline btn-lg text-dark border-dark"
          onClick={handleUpdateVersions}
        >
          {t("dashboard.btn_update_versions")}
        </button>
      </div>
    </div>
  );
};

export default DashboardActions;
