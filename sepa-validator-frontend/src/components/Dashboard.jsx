// src/components/Dashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import DashboardActions from "./DashboardActions";
import axiosInstance from "../axiosInstance";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../App.css";
import { useAuth } from "../store/AuthContext";

const PAGE_SIZE = 10;

const Dashboard = () => {
  const { user } = useAuth(); // 
  const [files, setFiles] = useState([]);          
  const [allFiles, setAllFiles] = useState([]);    
  const [search, setSearch] = useState("");
  const [isValid, setIsValid] = useState("");
  const [ordering, setOrdering] = useState("-uploaded_at");
  const [filterVersion, setFilterVersion] = useState("");

  const [page, setPage] = useState(1);             // page courante (1-based)
  const [totalCount, setTotalCount] = useState(0); // total d'items (utile pour DRF)
  const [serverPaginated, setServerPaginated] = useState(false); // DRF ou fallback client

  const { t } = useTranslation();
  const navigate = useNavigate();

  const fetchFiles = useCallback(async () => {
    try {
      const params = new URLSearchParams();

      if (search) params.append("filename", search);
      if (isValid) params.append("is_valid", isValid);
      if (ordering) params.append("ordering", ordering);
      if (filterVersion) params.append("version", filterVersion);

      // Pagination côté serveur (DRF)
      params.append("page", String(page));
      params.append("page_size", String(PAGE_SIZE));

      const res = await axiosInstance.get(`/api/results/?${params.toString()}`);
      const data = res.data;

      if (Array.isArray(data)) {
        // 🔁 Fallback : le backend ne paginate pas → on pagine côté client
        setServerPaginated(false);
        setAllFiles(data);
        const start = (page - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        setFiles(data.slice(start, end));
        setTotalCount(data.length);
      } else if (data && Array.isArray(data.results)) {
        // ✅ DRF standard : { count, results, next, previous }
        setServerPaginated(true);
        setFiles(data.results);
        setTotalCount(data.count ?? data.results.length);
      } else {
        // Cas inattendu : on essaye de traiter comme tableau
        const arr = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
        setServerPaginated(true);
        setFiles(arr);
        setTotalCount(arr.length);
      }
    } catch (err) {
      console.error(t("errors.fetchingFiles"), err);
    }
  }, [search, isValid, ordering, filterVersion, page, t]);

  // Requêtes quand filtres/tri/page changent
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Quand on modifie un filtre → revenir à la page 1
  useEffect(() => {
    setPage(1);
  }, [search, isValid, ordering, filterVersion]);

  const handleDelete = async (id) => {
    if (window.confirm(t("actions.confirmDelete"))) {
      try {
        await axiosInstance.delete(`/api/results/${id}/delete/`);
        // Rafraîchir la liste
        fetchFiles();
      } catch (err) {
        console.error(t("errors.deletingFile"), err);
      }
    }
  };

  const handleReviewResult = (id) => {
    navigate(`/sepa/${id}`);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const goToPage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  // Pagination compacte (…)
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const items = [];
    const addItem = (p, label = p, active = false, disabled = false) => {
      items.push(
        <li key={`p-${p}-${label}`} className={`page-item ${active ? "active" : ""} ${disabled ? "disabled" : ""}`}>
          <button className="page-link" onClick={() => !disabled && goToPage(p)}>
            {label}
          </button>
        </li>
      );
    };

    addItem(page - 1, t("pagination.prev") || "«", false, page === 1);

    const pagesToShow = new Set([1, 2, totalPages, totalPages - 1, page - 1, page, page + 1]
      .filter(p => p >= 1 && p <= totalPages));
    const sorted = Array.from(pagesToShow).sort((a, b) => a - b);

    let last = 0;
    for (const p of sorted) {
      if (p - last > 1) {
        items.push(
          <li key={`ellipsis-${p}`} className="page-item disabled">
            <span className="page-link">…</span>
          </li>
        );
      }
      addItem(p, String(p), p === page);
      last = p;
    }

    addItem(page + 1, t("pagination.next") || "»", false, page === totalPages);

    return (
      <nav aria-label="pagination" className="mt-3">
        <ul className="pagination justify-content-center mb-0">{items}</ul>
      </nav>
    );
  };

  return (
    <div className="container mt-5">
      {/* Navbar est dans AppLayout → ne pas l’afficher ici */}
      <DashboardActions />

      <div className="card shadow p-4">
        <h4 className="mb-4 fw-bold text-primary text-center">
          {t("dashboard.title")}
        </h4>

        {/* Filtres */}
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <label className="form-label">{t("dashboard.searchLabel")}</label>
            <input
              type="text"
              className="form-control"
              placeholder={t("dashboard.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">{t("dashboard.validityLabel")}</label>
            <select
              className="form-select"
              value={isValid}
              onChange={(e) => setIsValid(e.target.value)}
            >
              <option value="">{t("dashboard.allOptions")}</option>
              <option value="true">{t("dashboard.validOption")}</option>
              <option value="false">{t("dashboard.invalidOption")}</option>
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">{t("dashboard.sortLabel")}</label>
            <select
              className="form-select"
              value={ordering}
              onChange={(e) => setOrdering(e.target.value)}
            >
              <option value="-uploaded_at">{t("dashboard.sortRecent")}</option>
              <option value="uploaded_at">{t("dashboard.sortOldest")}</option>
              <option value="xml_file">{t("dashboard.sortAZ")}</option>
              <option value="-xml_file">{t("dashboard.sortZA")}</option>
              <option value="version">{t("dashboard.sortVersionAZ")}</option>
              <option value="-version">{t("dashboard.sortVersionZA")}</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">{t("dashboard.versionLabel")}</label>
            <input
              type="text"
              className="form-control"
              placeholder={t("dashboard.versionPlaceholder")}
              value={filterVersion}
              onChange={(e) => setFilterVersion(e.target.value)}
            />
          </div>
        </div>

        {/* Tableau résultats */}
        {files.length > 0 ? (
          <>
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover text-center align-middle">
                <thead className="table-light">
                  <tr>
                    <th>{t("dashboard.table.filename")}</th>
                    <th>{t("dashboard.table.uploadDate")}</th>
                    <th>{t("dashboard.table.valid")}</th>
                    <th>{t("dashboard.table.version")}</th>
                    <th>{t("dashboard.table.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.id}>
                      <td>{file.filename}</td>
                      <td>{new Date(file.uploaded_at).toLocaleString()}</td>
                      <td>
                        {file.is_valid ? (
                          <span className="badge bg-success">{t("dashboard.badges.yes")}</span>
                        ) : (
                          <span className="badge bg-danger">{t("dashboard.badges.no")}</span>
                        )}
                      </td>
                      <td>{file.version || "-"}</td>
                      <td>
                        <div className="btn-group">
                          <button
                            className="btn btn-sm btn-outline text-dark border-dark"
                            onClick={() => handleReviewResult(file.id)}
                          >
                            {t("dashboard.actions.report")}
                          </button>
                          <button
                            className="btn btn-sm btn-outline text-dark border-dark"
                            onClick={() => handleDelete(file.id)}
                          >
                            {t("dashboard.actions.delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {renderPagination()}
          </>
        ) : (
          <div className="alert alert-warning text-center mt-4">
            {t("dashboard.noResults")}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
