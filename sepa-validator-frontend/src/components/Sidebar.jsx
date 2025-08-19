import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import axiosInstance from "../axiosInstance";
import { useTranslation } from "react-i18next";
import { FaTachometerAlt, FaUpload, FaChartBar, FaBell, FaUser } from "react-icons/fa";

export default function Sidebar() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);

  // Récupération notifications
  const fetchNotifications = async () => {
    try {
      const res = await axiosInstance.get("/api/notifications/");
      setNotifications(res.data);
    } catch (err) {
      console.error("Erreur lors de la récupération des notifications :", err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axiosInstance.post(`/api/notifications/${id}/mark-read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error("Erreur lors du marquage comme lu :", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const hasUnread = notifications.some((n) => n.is_read === false);
  const sortedNotifications = [...notifications].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );

  return (
    <div className="card card-shadow border-0 rounded-4 p-3 h-100">
      <ul className="nav flex-column gap-2">
        <li className="nav-item">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              "btn w-100 text-start " + (isActive ? "active-soft" : "btn-light")
            }
          >
            <FaTachometerAlt className="me-2" />
            {t("sidebar.dashboard")}
          </NavLink>
        </li>

        <li className="nav-item">
          <NavLink
            to="/upload"
            className={({ isActive }) =>
              "btn w-100 text-start " + (isActive ? "active-soft" : "btn-light")
            }
          >
            <FaUpload className="me-2" />
            {t("sidebar.upload")}
          </NavLink>
        </li>

        <li className="nav-item">
          <NavLink
            to="/statistics"
            className={({ isActive }) =>
              "btn w-100 text-start " + (isActive ? "active-soft" : "btn-light")
            }
          >
            <FaChartBar className="me-2" />
            {t("sidebar.statistics")}
          </NavLink>
        </li>

        {/* Notifications */}
        <li className="nav-item">
          <button
            className="btn w-100 text-start position-relative btn-light"
            data-bs-toggle="offcanvas"
            data-bs-target="#notificationsOffcanvas"
            aria-controls="notificationsOffcanvas"
          >
            <FaBell className="me-2" />
            {t("sidebar.notifications")}
            {hasUnread && (
              <span
                className="position-absolute top-50 end-0 translate-middle-y me-3 p-1 bg-danger border border-light rounded-circle"
                style={{ fontSize: "0.6rem" }}
              />
            )}
          </button>
        </li>

        <li className="nav-item">
          <NavLink
            to="/account"
            className={({ isActive }) =>
              "btn w-100 text-start " + (isActive ? "active-soft" : "btn-light")
            }
          >
            <FaUser className="me-2" />
            {t("sidebar.account")}
          </NavLink>
        </li>
      </ul>

      {/* ✅ Offcanvas pour notifications */}
      <div
        className="offcanvas offcanvas-end"
        tabIndex="-1"
        id="notificationsOffcanvas"
        aria-labelledby="notificationsOffcanvasLabel"
      >
        <div className="offcanvas-header">
          <h5 className="offcanvas-title" id="notificationsOffcanvasLabel">
            {t("sidebar.notifications")}
          </h5>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          ></button>
        </div>
        <div className="offcanvas-body">
          {sortedNotifications.length === 0 ? (
            <p className="text-muted">{t("dashboard.no_notifications")}</p>
          ) : (
            <ul className="list-unstyled">
              {sortedNotifications.map((notif) => {
                const formattedDate = new Date(notif.created_at).toLocaleString();

                return (
                  <li
                    key={notif.id}
                    className={`mb-3 p-2 rounded ${
                      notif.is_read ? "bg-light" : "bg-warning"
                    }`}
                    onClick={() => markAsRead(notif.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <strong>{notif.title}</strong>
                    <p className="mb-1 small">{notif.message}</p>
                    <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                      {formattedDate}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
