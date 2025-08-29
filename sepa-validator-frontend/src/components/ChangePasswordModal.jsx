import React, {useState} from "react";
import { useTranslation } from "react-i18next";
import axiosInstance from "../axiosInstance";

export default function ChangePasswordModal({ id = "changePwdModal"}) {
    const { t } = useTranslation();

    const [oldPassword, setOldPassword] = useState("");
    const [newPassword1, setNewPassword1] = useState("");
    const [newPassword2, setNewPassword2] = useState("");
    const [busy, setBusy] = useState(false);

    const [errors, setErrors] = useState({
        old_password: [],
        new_password: [],
        non_field_errors: [],
        detail: "",
    });

    const resetErrors = () =>
        setErrors({
            old_password: [],
            new_password: [],
            non_field_errors: [],
            detail: "",
        });

    const onSubmit = async (e) => {
        e.preventDefault();
        resetErrors();

        if (newPassword1 !== newPassword2) {
            setErrors((prev) => ({
                ...prev,
                new_password: [
                    t("account.password_mismatch") || "Passwords do not match",
                ],
            }));
            return ;
        }

        setBusy(true);
        try {
            await axiosInstance.post("/api/accounts/me/change-password/", {
                old_password: oldPassword,
                new_password: newPassword1,
            });

            const modalEl = document.getElementById(id);
            if (modalEl) {
                const modal = window.bootstrap?.Modal.getOrCreateInstance(modalEl);
                modal?.hide();
            }

            setOldPassword("");
            setNewPassword1("");
            setNewPassword2("");
            alert(t("account.password_changed") || "Password Changed. ");
        } catch (e) {
            const data = e?.response?.data || {};

            const toArray = (v) => 
                Array.isArray(v) ? v : v ? [String(v)] : [];

            setErrors({
                old_password: toArray(data.old_password),
                new_password: toArray(data.new_password),
                non_field_errors: toArray(data.non_field_errors),
                detail: typeof data.detail === "string" ? data.detail : "",
            });
        } finally {
            setBusy(false);
        }
    };

    const renderErrors = (name) => 
        Array.isArray(errors[name]) && 
        errors[name].length > 0 && (
            <ul className="text-danger small mt-2 mb-0">
                {errors[name].map((msg, i) => (
                    <li key={`${name}-${i}`}>{String(msg)}</li>
                ))}
            </ul>
        );

    return (
    <div className="modal fade" id={id} tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <form className="modal-content" onSubmit={onSubmit}>
          <div className="modal-header">
            <h5 className="modal-title">
              {t("account.change_password") || "Change password"}
            </h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
              disabled={busy}
            />
          </div>

          <div className="modal-body">
            {/* Message d'erreur global éventuel */}
            {errors.detail && (
              <div className="alert alert-danger">{errors.detail}</div>
            )}
            {renderErrors("non_field_errors")}

            <div className="mb-3">
              <label className="form-label">
                {t("account.old_password") || "Old password"}
              </label>
              <input
                className="form-control"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                disabled={busy}
              />
              {renderErrors("old_password")}
            </div>

            <div className="mb-3">
              <label className="form-label">
                {t("account.new_password") || "New password"}
              </label>
              <input
                className="form-control"
                type="password"
                value={newPassword1}
                onChange={(e) => setNewPassword1(e.target.value)}
                required
                disabled={busy}
              />
              {renderErrors("new_password")}
            </div>

            <div>
              <label className="form-label">
                {t("account.confirm_new_password") || "Confirm new password"}
              </label>
              <input
                className="form-control"
                type="password"
                value={newPassword2}
                onChange={(e) => setNewPassword2(e.target.value)}
                required
                disabled={busy}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              className="btn btn-outline-secondary"
              type="button"
              data-bs-dismiss="modal"
              disabled={busy}
            >
              {t("common.cancel") || "Cancel"}
            </button>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy
                ? t("common.saving") || "Saving…"
                : t("account.update_password") || "Update password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}