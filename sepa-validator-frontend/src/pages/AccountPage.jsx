// src/pages/AccountPage.jsx
import React, { useEffect, useRef, useState } from "react";
import axiosInstance from "../axiosInstance";
import { useTranslation } from "react-i18next";
import { useAuth } from "../store/AuthContext";
import { absolutize } from "../utils/url";
import ChangePasswordModal from "../components/ChangePasswordModal";

/** Endpoints */
const PROFILE_GET = "/api/accounts/me/";
const PROFILE_UPDATE = "/api/accounts/me/update/";
const EMAILS_GET = "/api/accounts/emails/";
const EMAILS_CREATE = "/api/accounts/emails/";
const AVATAR_UPLOAD = "/api/accounts/me/avatar/";

export default function AccountPage() {
  const { t } = useTranslation();
  const { reloadMe } = useAuth();

  // Form state
  const [fullName, setFullName] = useState("");
  const [nickName, setNickName] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");
  const [timezone, setTimezone] = useState("");

  // Identity
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Emails additionnels
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");

  // UI
  const [saving, setSaving] = useState(false);
  const [addingEmail, setAddingEmail] = useState(false);
  const fileInputRef = useRef(null);

  const DEFAULT_AVATAR = "https://i.pravatar.cc/96?u=user";

  /** Chargement profil + emails */
  const loadProfile = async () => {
    try {
      const [me, list] = await Promise.all([
        axiosInstance.get(PROFILE_GET),
        axiosInstance.get(EMAILS_GET).catch(() => ({ data: [] })),
      ]);

      const u = me.data || {};
      const first = u.first_name || "";
      const last = u.last_name || "";
      const full = (first || last) ? `${first} ${last}`.trim() : (u.username || "");

      setDisplayName(full || u.email || "User");
      setPrimaryEmail(u.email || "");
      setAvatarUrl(u.avatar ? absolutize(u.avatar) : DEFAULT_AVATAR);

      setFullName(u.full_name || full);
      setNickName(u.nick_name || u.username || "");
      setGender(u.gender || "");
      setCountry(u.country || "");
      setLanguage(u.language || "");
      setTimezone(u.timezone || "Africa/Tunis");

      setEmails(Array.isArray(list.data) ? list.data : []);
    } catch (err) {
      console.error("Erreur chargement profil:", err);
    }
  };

  useEffect(() => {
    (async () => {
      await loadProfile();
      // garde le contexte aligné au 1er chargement (Navbar, etc.)
      try { await reloadMe(); } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Sauvegarde du formulaire */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axiosInstance.put(PROFILE_UPDATE, {
        full_name: fullName,
        nick_name: nickName,
        gender,
        country,
        language,
        timezone,
      });
      // synchro globale (Navbar + contexts)
      try { await reloadMe(); } catch {}
      await loadProfile();
      alert(t("account.saved") || "Saved");
    } catch (err) {
      console.error("Erreur update profil:", err);
      alert(t("account.save_error") || "Error while saving");
    } finally {
      setSaving(false);
    }
  };

  /** Ajout d’un email */
  const handleAddEmail = async () => {
    const emailToAdd = (newEmail || "").trim();
    if (!emailToAdd) return;
    setAddingEmail(true);
    try {
      const res = await axiosInstance.post(EMAILS_CREATE, { email: emailToAdd });
      setEmails((prev) => [res.data, ...prev]);
      setNewEmail("");
    } catch (err) {
      console.error("Erreur ajout email:", err);
      alert(t("account.add_email_error") || "Cannot add email");
    } finally {
      setAddingEmail(false);
    }
  };

  const handleDeleteEmail = async (id) => {
    if (!window.confirm(t("account.confirm_delete_email") || " Delete this email ?"))
    try {
      await axiosInstance.delete(`/api/accounts/emails/${id}/`);
      setEmails(prev => prev.filter(e => e.id !== id));
    } catch (e) {
      console.error("Delete email error:", e);
      alert(t("account.delete_email_error") || "Cannot delete email");
    }
  };

  /** Upload avatar */
  const handleAvatarChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const form = new FormData();
    form.append("avatar", f);
    try {
      const res = await axiosInstance.put(AVATAR_UPLOAD, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const newUrl = res?.data?.avatar ? absolutize(res.data.avatar) : "";
      if (newUrl) {
        // cache-busting local pour que l’aperçu change instantanément
        const busted = `${newUrl}${newUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
        setAvatarUrl(busted);
      } else {
        await loadProfile();
      }
      // synchro globale (Navbar)
      try { await reloadMe(); } catch {}
    } catch (err) {
      console.error("Erreur upload avatar:", err);
      alert(t("account.avatar_error") || "Avatar upload failed");
    }
  };

  return (
    <div className="card card-shadow border-0 rounded-4 overflow-hidden">
      <div className="band-soft" />
      <div className="card-body p-4 p-md-5">
        {/* En-tête avatar + nom + email + Edit */}
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div className="d-flex align-items-center gap-3">
            <img
              src={avatarUrl || DEFAULT_AVATAR}
              alt="avatar"
              className="rounded-circle border"
              width="72"
              height="72"
            />
            <div>
              <h6 className="mb-0">{displayName}</h6>
              <small className="text-muted">{primaryEmail}</small>
            </div>
          </div>

          <div className="d-flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="d-none"
              onChange={handleAvatarChange}
            />
            <button
              className="btn btn-outline-primary"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              {t("account.edit") || "Edit"}
            </button>
            <button
              className="btn btn-outline-secondary"
              type="button"
              data-bs-toggle="modal"
              data-bs-target="#changePwdModal"
            >
              {t("account.change_password") || "Change Password"}
            </button>
          </div>
        </div>

        {/* Formulaire */}
        <form className="row g-4" onSubmit={handleSubmit}>
          <div className="col-12 col-md-6">
            <label className="form-label">{t("account.full_name") || "Full Name"}</label>
            <input
              type="text"
              className="form-control form-control-soft"
              placeholder={t("placeholders.full_name") || "Your First Name"}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">{t("account.nick_name") || "Nick Name"}</label>
            <input
              type="text"
              className="form-control form-control-soft"
              placeholder={t("placeholders.nick_name") || "Your First Name"}
              value={nickName}
              onChange={(e) => setNickName(e.target.value)}
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">{t("account.gender") || "Gender"}</label>
            <select
              className="form-select form-control-soft"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="">{t("placeholders.select") || "Select..."}</option>
              <option value="female">{t("account.gender_female") || "Female"}</option>
              <option value="male">{t("account.gender_male") || "Male"}</option>
              <option value="other">{t("account.gender_other") || "Other"}</option>
            </select>
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">{t("account.country") || "Country"}</label>
            <select
              className="form-select form-control-soft"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="">{t("placeholders.select") || "Select..."}</option>
              <option value="tn">Tunisia</option>
              <option value="fr">France</option>
              <option value="de">Germany</option>
              <option value="us">United States</option>
            </select>
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">{t("account.language") || "Language"}</label>
            <select
              className="form-select form-control-soft"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="">{t("placeholders.select") || "Select..."}</option>
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label">{t("account.timezone") || "Time Zone"}</label>
            <select
              className="form-select form-control-soft"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="">{t("placeholders.select") || "Select..."}</option>
              <option value="UTC">UTC</option>
              <option value="Africa/Tunis">Africa/Tunis</option>
              <option value="Europe/Paris">Europe/Paris</option>
              <option value="Europe/Berlin">Europe/Berlin</option>
            </select>
          </div>

          <div className="col-12">
            <button type="submit" className="btn btn-outline-primary" disabled={saving}>
              {saving ? (t("account.saving") || "Saving…") : (t("account.save") || "Save changes")}
            </button>
          </div>
        </form>

        {/* Section emails */}
        <div className="mt-4 pt-4 border-top">
          <h6 className="mb-3">{t("account.my_emails") || "My email address"}</h6>

          <div className="d-flex align-items-start gap-3 mb-3">
            <span
              className="btn btn-primary btn-icon rounded-circle p-0 d-inline-flex align-items-center justify-content-center"
              style={{ width: 36, height: 36 }}
              aria-hidden="true"
            >
              <i className="bi bi-envelope" />
            </span>
            <div>
              <div className="fw-medium">{primaryEmail || "-"}</div>
              <small className="text-muted">{t("account.primary_email") || "Primary email"}</small>
            </div>
          </div>

          {emails?.length > 0 && (
            <ul className="list-group mb-3">
              {emails.map((e) => (
                <li key={e.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-medium">{e.email}</div>
                    <small className="text-muted">
                      {e.is_primary ? (t("account.primary") || "Primary") : (t("account.secondary") || "Secondary")} •{" "}
                      {e.is_verified ? (t("account.verified") || "Verified") : (t("account.unverified") || "Unverified")}
                    </small>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <small className="text-muted">
                      {e.created_at ? new Date(e.created_at).toLocaleDateString() : ""}
                    </small>

                    {!e.is_primary && (
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteEmail(e.id)}
                        title={t("account.delete_email") || "Delete email"}
                      >
                        {t("common.delete") || "Delete"}
                      </button>
                    )}
                  </div>
                  <small className="text-muted">
                    {e.created_at ? new Date(e.created_at).toLocaleDateString() : ""}
                  </small>
                </li>
              ))}
            </ul>
          )}

          <div className="d-flex flex-wrap gap-2">
            <input
              type="email"
              className="form-control"
              placeholder={t("account.add_email") || "name@example.com"}
              style={{ maxWidth: 320 }}
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <button className="btn btn-outline-primary" onClick={handleAddEmail} disabled={addingEmail}>
              {addingEmail ? (t("account.adding") || "Adding…") : `+ ${t("account.add_email") || "Add Email Address"}`}
            </button>
          </div>
        </div>
      </div>
      <ChangePasswordModal id="changePwdModal" />
    </div>
  );
}
