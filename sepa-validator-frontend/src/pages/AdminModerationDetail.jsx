// Exemple: AdminModerationDetail.jsx
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";

export default function AdminModerationDetail(){
  const { id } = useParams();
  const [row, setRow] = useState(null);

  const load = ()=> axiosInstance.get(`/api/sepa/moderation/files/${id}/`).then(r=>setRow(r.data));
  useEffect(()=>{ load(); }, [id]);

  const revalidate = async () => {
    await axiosInstance.post(`/api/sepa/moderation/files/${id}/revalidate/`, { mode: "full", notify: true });
    await load();
    alert("Revalidation effectuée.");
  };

  const setValidity = async (value) => {
    const reason = value ? null : prompt("Raison (optionnel) ?");
    await axiosInstance.post(`/api/sepa/moderation/files/${id}/set-validity/`, { is_valid: value, reason, notify: true });
    await load();
  };

  if(!row) return "Chargement...";
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Fichier #{row.id} — {row.filename}</h1>
      <div>Valide: {String(row.is_valid)}</div>
      <div>Version: {row.version || "—"}</div>

      <div className="flex gap-2">
        <button className="px-3 py-2 bg-black text-white rounded" onClick={revalidate}>
          Revalider
        </button>
        <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={()=>setValidity(true)}>
          Marquer VALIDE
        </button>
        <button className="px-3 py-2 bg-red-600 text-white rounded" onClick={()=>setValidity(false)}>
          Marquer INVALIDE
        </button>
      </div>
    </div>
  );
}
