// src/pages/ChangePasswordPage.jsx
import { useState } from "react";
import { changePassword } from "../api/account";
import { Link } from "react-router-dom";

export default function ChangePasswordPage() {
  const [old_password, setOld] = useState("");
  const [new_password, setNew] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await changePassword({ old_password, new_password });
      setOld(""); setNew("");
      alert("Mot de passe changé.");
    } catch (e) {
      alert(e?.response?.data?.detail || "Erreur.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container py-4">
      <h1 className="mb-3">Changer le mot de passe</h1>
      <form onSubmit={submit}>
        <div className="mb-3">
          <label className="form-label">Ancien mot de passe</label>
          <input type="password" className="form-control"
                 value={old_password} onChange={e=>setOld(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label">Nouveau mot de passe</label>
          <input type="password" className="form-control"
                 value={new_password} onChange={e=>setNew(e.target.value)} />
          <div className="form-text">Doit respecter les règles de complexité Django.</div>
        </div>
        <button className="btn btn-dark" disabled={busy}>Mettre à jour</button>
        <Link to="/account" className="btn btn-link">Annuler</Link>
      </form>
    </div>
  );
}
