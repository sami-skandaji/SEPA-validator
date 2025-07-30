import React, { useEffect, useState, useCallback } from "react";
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

  const fetchFiles = useCallback(() => {
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
  }, [search, isValid, ordering, filterVersion]);

  useEffect(() => {
    axios
      .get("http://localhost:8000/api/user-info/", {
        headers: {
          Authorization: `Token ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => setUsername(res.data.username));

    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

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

  const handleReviewResult = (id) => {
    navigate(`/sepa/${id}`);
  };

  return (
    <div className="container mt-5">
      <Navbar username={username} />
      <DashboardActions username={username} />

      <div className="card shadow p-4">
        <h4 className="mb-4 fw-bold text-primary text-center">
          Historique de vos fichiers SEPA
        </h4>
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <label className="form-label">Rechercher par nom</label>
            <input
              type="text"
              className="form-control"
              placeholder="ex: fichier.xml"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">Validité</label>
            <select
              className="form-select"
              value={isValid}
              onChange={(e) => setIsValid(e.target.value)}
            >
              <option value="">Toutes</option>
              <option value="true">Valide</option>
              <option value="false">Invalide</option>
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">Trier par</label>
            <select
              className="form-select"
              value={ordering}
              onChange={(e) => setOrdering(e.target.value)}
            >
              <option value="-uploaded_at">Plus récent</option>
              <option value="uploaded_at">Plus ancien</option>
              <option value="xml_file">Nom A-Z</option>
              <option value="-xml_file">Nom Z-A</option>
              <option value="version">Version A-Z</option>
              <option value="-version">Version Z-A</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Version SEPA</label>
            <input
              type="text"
              className="form-control"
              placeholder="ex: pain.001.001.03"
              value={filterVersion}
              onChange={(e) => setFilterVersion(e.target.value)}
            />
          </div>
        </div>
        {files.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-bordered table-striped table-hover text-center align-middle">
              <thead className="table-light">
                <tr>
                  <th>Nom du fichier</th>
                  <th>Date d’upload</th>
                  <th>Valide ?</th>
                  <th>Version</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id}>
                    <td>{file.filename}</td>
                    <td>{new Date(file.uploaded_at).toLocaleString()}</td>
                    <td>
                      {file.is_valid ? (
                        <span className="badge bg-success">Oui</span>
                      ) : (
                        <span className="badge bg-danger">Non</span>
                      )}
                    </td>
                    <td>{file.version || "-"}</td>
                    <td>
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-outline text-dark border-dark"
                          onClick={() => handleReviewResult(file.id)}
                        >
                          Rapport
                        </button>
                        <button
                          className="btn btn-sm btn-outline text-dark border-dark"
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
          </div>
        ) : (
          <div className="alert alert-warning text-center mt-4">
            Aucun fichier ne correspond à vos critères de recherche.
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
