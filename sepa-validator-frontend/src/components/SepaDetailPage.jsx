import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../axiosInstance";
import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";
import autoTable from "jspdf-autotable";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

function SepaDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [meta, setMeta] = useState(null);
  const [details, setDetails] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
  const fetchFile = async () => {
    try {
      const res = await axiosInstance.get(`/api/results/${id}/`);
      setMeta({
        file_name: res.data.filename,
        validation_result: [
          ...(res.data.validation_report || []),
          ...(res.data.business_checks || []),
        ],
      });
      setDetails(res.data.sepa_details);
    } catch (err) {
      if (err.response?.status === 401) {
        // Token vraiment expiré
        navigate("/login");
      } else {
        setError(t("detail.error_loading"));
      }
    }
  };

  fetchFile();
}, [id, navigate, t]);

  const exportToPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(t("detail.pdf_title"), 14, 20);

    doc.setFontSize(12);
    doc.text(`${t("detail.file_name")} : ${meta.file_name}`, 14, 30);
    doc.text(`${t("detail.message_count")} : ${meta.validation_result.length}`, 14, 38);

    autoTable(doc, {
      startY: 45,
      head: [[t("detail.type"), t("detail.code"), t("detail.field"), t("detail.message")]],
      body: meta.validation_result.map((msg) => [
        (msg.type || "").toUpperCase(),
        msg.code,
        msg.field,
        translateMessage(msg),
      ]),
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [22, 160, 133] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 20 },
        2: { cellWidth: 35 },
        3: { cellWidth: 115 },
      },
    });
    doc.save(`${meta.file_name || "rapport-sepa"}.pdf`);
  };

  const exportToTXT = () => {
    let txt = `--- ${t("detail.txt_title")} ---\n`;
    txt += `${t("detail.file_name")} : ${meta.file_name}\n`;
    txt += `${t("detail.message_count")} : ${meta.validation_result.length}\n\n`;

    meta.validation_result.forEach((msg, i) => {
      txt += `${i + 1}. [${(msg.type || "").toUpperCase()}] ${t("detail.code")}: ${msg.code}, ${t("detail.field")}: ${msg.field}\n    → ${translateMessage(msg)}\n\n`;
    });

    const blob = new Blob([txt], {
      type: "text/plain;charset=utf-8",
    });
    saveAs(blob, `${meta.file_name || "rapport-sepa"}.txt`);
  };

  const translateMessage = (msg) => {
    if (typeof msg === 'string') {
      return t(`validation.${msg}`, msg);
    } else if (typeof msg === 'object' && msg.code) {
      return t(`validation.${msg.code}`, msg.message || msg.code);
    } else if (typeof msg === 'object' && msg.message) {
      return msg.message;
    }
    return t('validation.UnknownError');
  };


  if (error) return <p className="text-danger">{error}</p>;
  if (!meta || !details) return <p>{t("detail.loading")}</p>;



  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 fw-bold">{t("detail.page_title")}</h1>
        </div>
        <div className="btn-group">
          <button className="btn btn-blue text-center" onClick={exportToPDF}>
            {t("detail.export_pdf")}
          </button>
          <button className="btn btn-blue text-center" onClick={exportToTXT}>
            {t("detail.export_txt")}
          </button>
        </div>
      </div>

      <p className="fw-medium mb-3">
        {t("detail.file_name")} : {meta.file_name}
      </p>

      <section className="mb-4">
        <h5 className="fw-bold mb-2">{t("detail.validation_results")}</h5>
        {meta.validation_result.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-bordered table-sm">
              <thead className="table-light">
                <tr>
                  <th>{t("detail.type")}</th>
                  <th>{t("detail.code")}</th>
                  <th>{t("detail.field")}</th>
                  <th>{t("detail.message")}</th>
                </tr>
              </thead>
              <tbody>
                {meta.validation_result.map((msg, idx) => (
                  <tr
                    key={idx}
                    className={
                      msg.type === "error"
                        ? "table-danger"
                        : msg.type === "warning"
                        ? "table-warning"
                        : "table-success"
                    }
                  >
                    <td>
                      {msg.type === "error" && "❌"}
                      {msg.type === "warning" && "⚠️"}
                      {msg.type === "success" && "✅"}
                    </td>
                    <td>{msg.code}</td>
                    <td>{msg.field}</td>
                    <td>{t(`validation.${msg.code}`, { iban: msg.message, defaultValue: msg.message })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted">{t("detail.no_messages")}</p>
        )}
      </section>

      {details.entete && (
        <section className="mb-4">
          <h5 className="fw-bold mb-2">{t("detail.header_info")}</h5>
          <div className="table-responsive">
            <table className="table table-bordered table-sm">
              <thead className="table-light">
                <tr>
                  <th>{t("detail.submission_ref")}</th>
                  <th>{t("detail.creation_date")}</th>
                  <th>{t("detail.transaction_count")}</th>
                  <th>{t("detail.total_amount")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{details.entete.reference_remise}</td>
                  <td>{details.entete.date_creation}</td>
                  <td>{details.entete.nombre_transactions}</td>
                  <td>{details.entete.montant_total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mb-4">
        <h5 className="fw-bold mb-2">{t("detail.payment_info")}</h5>
        {details.paiements && details.paiements.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-bordered table-sm">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>{t("detail.method")}</th>
                  <th>{t("detail.service_level")}</th>
                  <th>{t("detail.local_instrument")}</th>
                  <th>{t("detail.sequence_type")}</th>
                  <th>{t("detail.execution_date")}</th>
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
          <p className="text-muted">{t("detail.no_payments")}</p>
        )}
      </section>

      <section className="mb-4">
        <h5 className="fw-bold mb-2">{t("detail.transactions")}</h5>
        {details.transactions && details.transactions.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-bordered table-sm">
              <thead className="table-light">
                <tr>
                  <th>{t("detail.name")}</th>
                  <th>IBAN</th>
                  <th>{t("detail.reference")}</th>
                  <th>{t("detail.amount")}</th>
                  <th>{t("detail.warnings")}</th>
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
          <p className="text-muted">{t("detail.no_transactions")}</p>
        )}
      </section>

      <section className="mb-5">
        <h5 className="fw-bold mb-2">{t("detail.mandates_info")}</h5>
        {details.mandats && details.mandats.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-bordered table-sm">
              <thead className="table-light">
                <tr>
                  <th>{t("detail.mandate_id")}</th>
                  <th>{t("detail.signature_date")}</th>
                  <th>{t("detail.amended")}</th>
                </tr>
              </thead>
              <tbody>
                {details.mandats.map((m, idx) => (
                  <tr key={idx}>
                    <td>{m.mandate_id}</td>
                    <td>{m.signature_date}</td>
                    <td>{m.amendment ? t("detail.yes") : t("detail.no")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted">{t("detail.no_mandates")}</p>
        )}
      </section>
    </div>
  );
}

export default SepaDetailPage;
