import React from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const DashboardActions = ({ username }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleUpdateVersions = async () => {
    const confirmed = window.confirm("Mettre à jour les versions PAIN des anciens fichiers ?");
    if (!confirmed) return;

    try {
      const res = await axios.post("http://localhost:8000/api/update-versions/", null, {
        headers: {
          Authorization: `Token ${localStorage.getItem("token")}`,
        },
      });
      alert(`Mise à jour terminée : ${res.data.updated} fichiers mis à jour`);
      window.location.reload();
    } catch (err) {
      alert("Erreur lors de la mise à jour des versions");
      console.error(err);
    }
  };

  return (
    <div className="card shadow text-center mb-5 p-4">
      <h3 className="mb-4 fw-bold text-primary text-center">Bienvenue, {username} 👋</h3>
      <p className="lead">Que souhaitez-vous faire aujourd’hui ?</p>

      <div className="d-flex flex-wrap justify-content-center gap-3 mt-4">
        <button
          className="btn btn-outline btn-lg text-dark border-dark"
          onClick={() => navigate("/upload")}
        >
          Valider un fichier SEPA
        </button>

        <button
          className="btn btn-outline btn-lg text-dark border-dark"
          onClick={handleUpdateVersions}
        >
          Mettre à jour les versions
        </button>

        <button
          className="btn btn-outline btn-lg text-dark border-dark"
          onClick={handleLogout}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default DashboardActions;
