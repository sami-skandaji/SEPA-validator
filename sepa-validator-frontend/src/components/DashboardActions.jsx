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
    <div className="dashboard-card text-center mb-5">
      <h2 className="mb-4">Bienvenue {username} 👋</h2>
      <p className="lead">Que souhaitez-vous faire aujourd’hui ?</p>
      <div className="mt-4">
        <button
          className="btn btn-primary btn-lg mr-3"
          onClick={() => navigate("/upload")}
        >
          🧾 Valider un fichier SEPA
        </button>
        <button
          className="btn btn-secondary btn-lg"
          onClick={handleLogout}
        >
          🚪 Se déconnecter
        </button>
        <button
         className="btn btn-warning ml-2"
          onClick={handleUpdateVersions}
        >
            🔁 Mettre à jour les versions
        </button>
      </div>
    </div>
  );
};

export default DashboardActions;
