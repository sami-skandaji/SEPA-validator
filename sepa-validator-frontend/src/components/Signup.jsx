// src/components/Signup.jsx
import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import "../assets/styles.css";
import logo from "../assets/logo.png";

const Signup = () => {
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { t } = useTranslation();

  const base = process.env.REACT_APP_BASE_URL || "http://localhost:8000";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors("");

    if (password1 !== password2) {
      setErrors(t("signup.password_mismatch"));
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setErrors(t("signup.name_required") || "First name and last name are required.");
      return;
    }

    try {
      setLoading(true);

      // ✅ Inscription
      const res = await axios.post(`${base}/api/accounts/signup/`, {
        username: username.trim(),
        email: email.trim(),
        password1,
        password2,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });

      if (res.status === 201 || res.status === 200) {
        // ✅ Auto-login après inscription
        const loginRes = await axios.post(`${base}/api/accounts/login/`, {
          username: username.trim(),
          password: password1,
        });

        localStorage.setItem("access", loginRes.data.access);
        localStorage.setItem("refresh", loginRes.data.refresh);

        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      if (err.response?.data) {
        // essaie d’extraire un message lisible
        const data = err.response.data;
        const firstKey = Object.keys(data)[0];
        const msg =
          Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey] || t("signup.generic_error");
        setErrors(msg);
      } else {
        setErrors(t("signup.generic_error"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid px-1 px-md-5 px-lg-1 px-xl-5 py-5 mx-auto">
      <div className="card card0 border-0">
        <div className="row d-flex">
          {/* Logo */}
          <div className="col-lg-6 d-flex justify-content-center align-items-center">
            <div className="card1 pb-5">
              <div className="row px-3 justify-content-center border-line">
                <img src={logo} className="image" alt="logo" />
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="col-lg-6">
            <div className="card2 card border-0 px-4 py-5">
              <div className="d-flex justify-content-end mb-2">
                <LanguageSwitcher />
              </div>

              <div className="row px-3 mb-4">
                <h5 className="mb-0 mr-4 mt-2">{t("signup.title")}</h5>
              </div>

              {errors && (
                <div className="alert alert-danger" role="alert">
                  {errors}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="row px-3">
                  <label className="mb-1">
                    <h6 className="mb-0 text-sm">{t("signup.first_name") || "First name"}</h6>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>

                <div className="row px-3 mt-3">
                  <label className="mb-1">
                    <h6 className="mb-0 text-sm">{t("signup.last_name") || "Last name"}</h6>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>

                <div className="row px-3 mt-3">
                  <label className="mb-1">
                    <h6 className="mb-0 text-sm">{t("signup.username")}</h6>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="row px-3 mt-3">
                  <label className="mb-1">
                    <h6 className="mb-0 text-sm">{t("signup.email")}</h6>
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="row px-3 mt-3">
                  <label className="mb-1">
                    <h6 className="mb-0 text-sm">{t("signup.password")}</h6>
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    value={password1}
                    onChange={(e) => setPassword1(e.target.value)}
                    required
                  />
                </div>

                <div className="row px-3 mt-3">
                  <label className="mb-1">
                    <h6 className="mb-0 text-sm">{t("signup.confirm_password")}</h6>
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    required
                  />
                </div>

                <div className="row mb-3 px-3 mt-4">
                  <button type="submit" className="btn btn-blue text-center" disabled={loading}>
                    {loading ? t("common.loading") || "Loading…" : t("signup.register_button")}
                  </button>
                </div>

                <div className="row mb-4 px-3">
                  <small className="font-weight-bold">
                    {t("signup.already_account")}{" "}
                    <Link to="/login" className="text-danger">
                      {t("signup.login_link")}
                    </Link>
                  </small>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-blue py-4 text-center">
          <small className="text-white">© 2025. {t("signup.footer")}</small>
        </div>
      </div>
    </div>
  );
};

export default Signup;
