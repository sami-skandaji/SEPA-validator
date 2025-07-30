import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";
import autoTable from 'jspdf-autotable';

function SepaDetailPage() {
  const { id } = useParams();
  const [meta, setMeta] = useState(null);
  const [details, setDetails] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFile = async () => {
      try {
        const res = await axios.get(`http://localhost:8000/api/results/${id}/`, {
          headers: {
            Authorization: `Token ${localStorage.getItem("token")}`,
          },
        });

        setMeta({
          file_name: res.data.filename,
          validation_result: [
            ...(res.data.validation_report || []),
            ...(res.data.business_checks || [])  // 👈 on ajoute les règles métier
          ]
        });

        setDetails(res.data.sepa_details);
      } catch (err) {
        setError("Erreur lors du chargement du fichier SEPA.");
      }
    };
    fetchFile();
  }, [id]);

  const exportToPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Rapport de validation SEPA", 14, 20);

    doc.setFontSize(12);
    doc.text(`Nom du fichier : ${meta.file_name}`, 14, 30);
    doc.text(`Nombre de messages : ${meta.validation_result.length}`, 14, 38);

    autoTable(doc, {
      startY: 45,
      head: [["Type", "Code", "Champ", "Message"]],
      body: meta.validation_result.map(msg => [
        (msg.type || "").toUpperCase(),
        msg.code,
        msg.field,
        msg.message
      ]),
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [22, 160, 133] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 20 },
        2: { cellWidth: 35 },
        3: { cellWidth: 115 }
      }
    });
    doc.save(`${meta.file_name || "rapport-sepa"}.pdf`);
  };

  const exportToTXT = () => {
    let txt = `--- Rapport de validation SEPA ---\n`;
    txt += `Fichier : ${meta.file_name}\n`;
    txt += `Nombre de messages : ${meta.validation_result.length}\n\n`;

    meta.validation_result.forEach((msg, i) => {
      txt += `${i + 1}. [${(msg.type || "").toUpperCase()}] Code: ${msg.code}, Champ: ${msg.field}\n    → ${msg.message}\n\n`;
    });

    const blob = new Blob([txt], {
      type: "text/plain;charset=utf-8",
    });
    saveAs(blob, `${meta.file_name || "rapport-sepa"}.txt`);
  };

  if (error) return <p className="text-danger">{error}</p>;
  if (!meta || !details) return <p>Chargement...</p>;

  const plainTextReport = meta.validation_result
    .map(msg => `${(msg.type || "").toUpperCase()} [${msg.code}] (${msg.field}) → ${msg.message}`)
    .join("\n");

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center gap-3 mb-3">
        <button onClick={() => navigate("/dashboard")} className="btn btn-blue text-center">
          <i className="bi bi-arrow-left"></i> Dashboard
        </button>
        <button onClick={() => navigate("/upload")} className="btn btn-blue text-center">
          <i className="bi bi-plus-circle"></i> Nouveau fichier
        </button>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h4 fw-bold">Détails du fichier SEPA</h1>
        <div className="btn-group">
          <button className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={exportToPDF}>
            Exporter en PDF
          </button>
          <button className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={exportToTXT}>
            Exporter en TXT
          </button>
        </div>
      </div>

      <p className="fw-medium mb-3">Nom du fichier : {meta.file_name}</p>

      <section className="mb-4">
        <h5 className="fw-bold mb-2">Résultats de validation</h5>
        {meta.validation_result.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-bordered table-sm">
              <thead className="table-light">
                <tr>
                  <th>Type</th>
                  <th>Code</th>
                  <th>Champ</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {meta.validation_result.map((msg, idx) => (
                  <tr key={idx} className={
                    msg.type === "error" ? "table-danger" :
                    msg.type === "warning" ? "table-warning" :
                    "table-success"
                  }>
                    <td>
                      {msg.type === "error" && "❌"}
                      {msg.type === "warning" && "⚠️"}
                      {msg.type === "success" && "✅"}
                    </td>
                    <td>{msg.code}</td>
                    <td>{msg.field}</td>
                    <td>{msg.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted">Aucun message de validation.</p>
        )}
      </section>

      {details.entete && (
        <section className="mb-4">
          <h5 className="fw-bold mb-2">En-tête</h5>
          <ul>
            <li>Référence remise : {details.entete.reference_remise}</li>
            <li>Date de création : {details.entete.date_creation}</li>
            <li>Nombre de transactions : {details.entete.nombre_transactions}</li>
            <li>Montant total : {details.entete.montant_total}</li>
          </ul>
        </section>
      )}

      <section className="mb-4">
        <h5 className="fw-bold mb-2">Informations des paiements</h5>
        {details.paiements && details.paiements.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-bordered table-sm">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Méthode</th>
                  <th>Service Level</th>
                  <th>Instrument local</th>
                  <th>Type séquence</th>
                  <th>Date d'exécution</th>
                </tr>
              </thead>
              <tbody>
                {details.paiements.map((pmt, idx) => (
                  <tr key={idx}>
                    <td>{pmt.id}</td>
                    <td>{pmt.methode}</td>
                    <td>{pmt.service_level}</td>
                    <td>{pmt.instrument_local}</td>
                    <td>{pmt.type_sequence}</td>
                    <td>{pmt.date_execution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted">Aucun paiement trouvé.</p>
        )}
      </section>

      <section className="mb-4">
        <h5 className="fw-bold mb-2">Transactions</h5>
        {details.transactions && details.transactions.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-bordered table-sm">
              <thead className="table-light">
                <tr>
                  <th>Nom</th>
                  <th>IBAN</th>
                  <th>Référence</th>
                  <th>Montant</th>
                  <th>Avertissements</th>
                </tr>
              </thead>
              <tbody>
                {details.transactions.map((tx, idx) => (
                  <tr key={idx}>
                    <td>{tx.nom}</td>
                    <td>{tx.iban}</td>
                    <td>{tx.reference}</td>
                    <td>{tx.montant}</td>
                    <td>
                      {tx.warnings && tx.warnings.length > 0 ? (
                        <ul className="text-danger mb-0">
                          {tx.warnings.map((warn, i) => (
                            <li key={i}>{warn}</li>
                          ))}
                        </ul>
                      ) : (
                        "✓"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted">Aucune transaction trouvée.</p>
        )}
      </section>

      <section className="mb-5">
        <h5 className="fw-bold mb-2">Informations des mandats</h5>
        {details.mandats && details.mandats.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-bordered table-sm">
              <thead className="table-light">
                <tr>
                  <th>Mandat ID</th>
                  <th>Date de signature</th>
                  <th>Amendé</th>
                </tr>
              </thead>
              <tbody>
                {details.mandats.map((m, idx) => (
                  <tr key={idx}>
                    <td>{m.mandate_id}</td>
                    <td>{m.signature_date}</td>
                    <td>{m.amendment ? "Oui" : "Non"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted">Aucun mandat trouvé.</p>
        )}
      </section>
    </div>
  );
}

export default SepaDetailPage;
