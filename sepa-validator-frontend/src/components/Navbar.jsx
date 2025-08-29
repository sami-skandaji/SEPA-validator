// src/components/Navbar.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../store/AuthContext";
import LanguageSwitcher from "./LanguageSwitcher";
import { useTheme } from "../store/ThemeContext";
import { absolutize } from "../utils/url";
import "../assets/styles.css";

export default function Navbar() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUser(null);
    navigate("/login", { replace: true });
  };

  const DEFAULT_AVATAR = "https://i.pravatar.cc/40?u=";
  const avatarUrl = user?.avatar ? absolutize(user.avatar) : DEFAULT_AVATAR;

  return (
    <header className="card card-shadow border-0 rounded-4 mb-4 p-3 px-4 d-flex flex-row align-items-center justify-content-between">
      <div className="d-flex align-items-center gap-3">
        <button
          className="navbar-brand font-weight-bold btn btn-link p-0"
          onClick={() => navigate("/dashboard")}
          style={{ textDecoration: "none" }}
        >
          <strong>SEPA Validator</strong>
        </button>

        <LanguageSwitcher />

        <button className="btn btn-outline-secondary ms-2" onClick={toggleTheme}>
          {isDark ? "☀️ Light" : "🌙 Dark"}
        </button>
      </div>

      <div className="d-flex align-items-center gap-3">
        {user ? (
          <>
            <span className="navbar-text">
              {t("navbar.logged_in_as")} <strong>{user.nick_name || user.email}</strong>
            </span>

            <img
              src={avatarUrl}
              alt="avatar"
              className="rounded-circle border"
              width="40"
              height="40"
            />

            <button onClick={handleLogout} className="btn btn-outline-danger">
              {t("navbar.logout")}
            </button>
          </>
        ) : (
          <Link to="/login" className="btn btn-outline-primary">
            {t("navbar.login") || "Login"}
          </Link>
        )}
      </div>
    </header>
  );
}
