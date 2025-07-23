
import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
import DashboardActions from "./DashboardActions";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [username, setUsername] = useState("");
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState("");
  const [isValid, setIsValid] = useState("");
  const [ordering, setOrdering] = useState("-uploaded_at");
  const [filterVersion, setFilterVersion] = useState("");

  const navigate = useNavigate();

  const fetchFiles = () => {
    const params = new URLSearchParams();
    if (search) params.append("filename", search);
    if (isValid) params.append("is_valid", isValid);
    if (ordering) params.append("ordering", ordering);
    if (filterVersion) params.append("version", filterVersion);

    axios
      .get(`http://localhost:8000/api/results/?${params.toString()}`, {
        headers: {
          Authorization: `Token ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        setFiles(res.data);
      })
      .catch((err) => {
        console.error("Erreur lors de la récupération des fichiers :", err);
      });
  };

  useEffect(() => {
    axios
      .get("http://localhost:8000/api/user-info/", {
        headers: {
          Authorization: `Token ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => setUsername(res.data.username));

    fetchFiles();
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [search, isValid, ordering, filterVersion]);

  const handleDelete = async (id) => {
    if (window.confirm("Supprimer ce fichier ?")) {
      try {
        await axios.delete(`http://localhost:8000/api/results/${id}/delete/`, {
          headers: {
            Authorization: `Token ${localStorage.getItem("token")}`,
          },
        });
        setFiles((prev) => prev.filter((file) => file.id !== id));
      } catch (err) {
        console.error("Erreur lors de la suppression :", err);
      }
    }
  };

  const handleReviewResult = async (id) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/results/${id}/`, {
        headers: {
          Authorization: `Token ${localStorage.getItem("token")}`,
        },
      });

      navigate("/upload/success", { state: { result: res.data } });
    } catch (err) {
      alert("Erreur lors de la récupération du rapport.");
    }
  };

  return (
    <div className="container mt-5">
      <Navbar username={username} />
      <DashboardActions username={username} />

      <div className="dashboard-card">
        <h4 className="mb-3">Historique de vos fichiers SEPA</h4>

        <div className="row mb-4">
          <div className="col-md-3">
            <input
              type="text"
              className="form-control"
              placeholder="Rechercher par nom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <select
              className="form-control"
              value={isValid}
              onChange={(e) => setIsValid(e.target.value)}
            >
              <option value="">Toutes les validités</option>
              <option value="true">Valide</option>
              <option value="false">Invalide</option>
            </select>
          </div>
          <div className="col-md-3">
            <select
              className="form-control"
              value={ordering}
              onChange={(e) => setOrdering(e.target.value)}
            >
              <option value="-uploaded_at">📅 Plus récent</option>
              <option value="uploaded_at">📅 Plus ancien</option>
              <option value="xml_file">🔤 Nom A-Z</option>
              <option value="-xml_file">🔤 Nom Z-A</option>
              <option value="version">🔢 Version A-Z</option>
              <option value="-version">🔢 Version Z-A</option>
            </select>
          </div>
          <div className="col-md-4">
            <input
              type="text"
              className="form-control"
              placeholder="Filtrer par version (ex: pain.001.001.03)"
              value={filterVersion}
              onChange={(e) => setFilterVersion(e.target.value)}
            />
          </div>
        </div>

        {files.length > 0 ? (
          <table className="table table-hover">
            <thead className="thead-light">
              <tr>
                <th>Nom du fichier</th>
                <th>Date d’upload</th>
                <th>Valide ?</th>
                <th>Version</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id}>
                  <td>{file.filename}</td>
                  <td>{new Date(file.uploaded_at).toLocaleString()}</td>
                  <td>{file.is_valid ? "Oui" : "Non"}</td>
                  <td>{file.version || "-"}</td>
                  <td>
                    <div className="btn-group">
                      <button
                        className="btn btn-sm btn-info"
                        onClick={() => handleReviewResult(file.id)}
                      >
                        Rapport
                      </button>
                      <button
                        className="btn btn-sm btn-dark"
                        onClick={() => handleDelete(file.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-muted mt-3">
            Aucun fichier ne correspond à vos critères.
          </p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
