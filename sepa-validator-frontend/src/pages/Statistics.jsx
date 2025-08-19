import React, { useEffect, useMemo, useState } from "react";
import axiosInstance from "../axiosInstance";
import { useTranslation } from "react-i18next";
import Chart from "react-apexcharts";
import { useTheme } from "../store/ThemeContext";

export default function Statistics() {
  const { t } = useTranslation();
  const { isDark } = useTheme(); // ✅ thème global

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [rangeDays, setRangeDays] = useState(30);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ts, setTs] = useState([]);           
  const [tsLoading, setTsLoading] = useState(true);
  const [tsError, setTsError] = useState(null);

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (startDate && endDate) {
      params.set("start_date", startDate);
      params.set("end_date", endDate);
    } else if (rangeDays) {
      params.set("days", String(rangeDays));
    }
    return params.toString();
  };

  // Fetch cards stats
  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        setLoading(true);
        const qs = buildQuery();
        const res = await axiosInstance.get(`/api/statistics/${qs ? `?${qs}` : ""}`);
        setStats(res.data);
      } catch (e) {
        setError(e?.response?.data || e?.message || "Error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [rangeDays, startDate, endDate]);

  // Fetch time series
  useEffect(() => {
    const loadTS = async () => {
      try {
        setTsError(null);
        setTsLoading(true);
        const qs = buildQuery();
        const res = await axiosInstance.get(`/api/statistics/timeseries/${qs ? `?${qs}` : ""}`);
        setTs(res.data.points || []);
      } catch (e) {
        setTsError(e?.response?.data || e?.message || "Error");
      } finally {
        setTsLoading(false);
      }
    };
    loadTS();
  }, [rangeDays, startDate, endDate]);

  // Defaults
  const valid = stats?.valid_files || 0;
  const invalid = stats?.invalid_files || 0;
  const total = stats?.total_files || (valid + invalid);
  const avgTx = stats?.avg_transactions_per_file || 0;
  const successRate = Math.max(0, Math.min(100, stats?.success_rate || 0));

  // Palette & Apex options
  const palette = useMemo(
    () => ({
      text: isDark ? "#e5e7eb" : "#374151",
      grid: isDark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.08)",
      green: "#10b981",
      red: "#ef4444",
      blue: "#3b82f6",
      violet: "#8b5cf6",
    }),
    [isDark]
  );

  const apexBase = useMemo(
    () => ({
      chart: { background: "transparent", foreColor: palette.text, toolbar: { show: false } },
      grid: { strokeDasharray: 4, borderColor: palette.grid },
      tooltip: { theme: isDark ? "dark" : "light" },
    }),
    [palette, isDark]
  );

  const donutSeries = [valid, invalid];
  const donutOptions = useMemo(
    () => ({
      ...apexBase,
      labels: [t("statistics.valid") || "Valid", t("statistics.invalid") || "Invalid"],
      colors: [palette.green, palette.red],
      legend: { position: "bottom", labels: { colors: palette.text } },
      dataLabels: { style: { fontSize: "14px", fontWeight: 600 } },
      stroke: { width: 0 },
      plotOptions: { pie: { donut: { size: "70%" } } },
    }),
    [apexBase, palette, t]
  );

  const barSeries = [{ name: t("statistics.files") || "Files", data: [total, valid, invalid] }];
  const barOptions = useMemo(
    () => ({
      ...apexBase,
      xaxis: {
        categories: [
          t("statistics.total_files") || "Total",
          t("statistics.valid") || "Valid",
          t("statistics.invalid") || "Invalid",
        ],
        labels: { style: { colors: palette.text } },
        axisBorder: { color: palette.grid },
        axisTicks: { color: palette.grid },
      },
      yaxis: { labels: { style: { colors: palette.text } } },
      plotOptions: { bar: { borderRadius: 10, columnWidth: "45%" } },
      fill: {
        type: "gradient",
        gradient: {
          shade: isDark ? "dark" : "light",
          type: "vertical",
          opacityFrom: 0.9,
          opacityTo: 0.9,
          stops: [0, 100],
        },
      },
      colors: [palette.blue],
      dataLabels: { enabled: true, style: { fontSize: "12px", fontWeight: 600, colors: [palette.text] } },
    }),
    [apexBase, palette, t, isDark]
  );

  const radialSeries = [successRate];
  const radialOptions = useMemo(
    () => ({
      ...apexBase,
      colors: [palette.violet],
      plotOptions: {
        radialBar: {
          hollow: { size: "65%" },
          track: { strokeWidth: "90%", opacity: isDark ? 0.25 : 0.15 },
          dataLabels: {
            name: { show: false },
            value: {
              show: true,
              fontSize: "28px",
              fontWeight: 800,
              formatter: (v) => `${v.toFixed(2)}%`,
            },
          },
        },
      },
      tooltip: { enabled: false },
    }),
    [apexBase, palette, isDark]
  );

  const tsSeries = useMemo(
    () => [
      { name: t("statistics.valid") || "Valid", data: ts.map((p) => ({ x: p.date, y: p.valid })) },
      { name: t("statistics.invalid") || "Invalid", data: ts.map((p) => ({ x: p.date, y: p.invalid })) },
    ],
    [ts, t]
  );

  const areaOptions = useMemo(
    () => ({
      ...apexBase,
      chart: { ...apexBase.chart, type: "area" },
      xaxis: { type: "datetime", labels: { style: { colors: palette.text } } },
      yaxis: { labels: { style: { colors: palette.text } } },
      stroke: { curve: "smooth", width: 2 },
      fill: {
        type: "gradient",
        gradient: {
          shade: isDark ? "dark" : "light",
          type: "vertical",
          opacityFrom: 0.35,
          opacityTo: 0.05,
          stops: [0, 100],
        },
      },
      colors: [palette.green, palette.red],
      dataLabels: { enabled: false },
      legend: { position: "top", labels: { colors: palette.text } },
    }),
    [apexBase, palette, isDark, t]
  );

  return (
    <div className={`page-bg ${isDark ? "dark" : ""}`}>
      <div className="container">
        {loading && <div className="text-center py-5">{t("common.loading") || "Loading..."}</div>}
        {error && (
          <div className="alert alert-danger my-3">
            {t("common.error") || "Error"}: {JSON.stringify(error)}
          </div>
        )}
        {!loading && !error && stats && (
          <>
            {/* Header */}
            <div className="mb-4 d-flex justify-content-between align-items-center section-head">
              <div>
                <h2 className="mb-1" style={{ color: palette.text }}>
                  {t("statistics.title") || "Statistics"}
                </h2>
                <p>{t("statistics.subtitle") || "Overview of your SEPA validation activity."}</p>
              </div>
              <div className="d-flex align-items-center gap-2">{/* actions si besoin */}</div>
            </div>

            <hr />

            {/* Filtres période */}
            <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
              <div className="btn-group btn-group-sm me-2" role="group" aria-label="range quick">
                {[7, 30, 90].map((d) => (
                  <button
                    key={d}
                    className={`btn ${rangeDays === d && !startDate && !endDate ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setRangeDays(d);
                    }}
                  >
                    {d}d
                  </button>
                ))}
              </div>

              <input
                type="date"
                className="form-control form-control-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="mx-1">–</span>
              <input
                type="date"
                className="form-control form-control-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />

              <button
                className="btn btn-sm btn-primary"
                onClick={() => {
                  if (startDate && endDate) setRangeDays(0);
                }}
              >
                {t("common.apply") || "Apply"}
              </button>

              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setRangeDays(30);
                }}
              >
                {t("common.reset") || "Reset"}
              </button>
            </div>

            <hr />

            {/* KPI Cards */}
            <div className="row g-3 mb-3">
              <div className="col-12 col-sm-6 col-xl-2">
                <div className="card glass-card h-100">
                  <div className="card-body">
                    <div className="text-muted small">{t("statistics.total_files") || "Total files"}</div>
                    <div className="fs-3 fw-bold" style={{ color: palette.text }}>
                      {total}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-xl-2">
                <div className="card glass-card h-100">
                  <div className="card-body">
                    <div className="text-muted small">{t("statistics.valid") || "Valid"}</div>
                    <div className="fs-3 fw-bold" style={{ color: palette.green }}>
                      {valid}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-xl-2">
                <div className="card glass-card h-100">
                  <div className="card-body">
                    <div className="text-muted small">{t("statistics.invalid") || "Invalid"}</div>
                    <div className="fs-3 fw-bold" style={{ color: palette.red }}>
                      {invalid}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card glass-card h-100">
                  <div className="card-body">
                    <div className="text-muted small">{t("statistics.success_rate") || "Success rate"}</div>
                    <div className="fs-3 fw-bold" style={{ color: palette.violet }}>
                      {successRate.toFixed(2)}%
                    </div>
                    <div
                      className="progress"
                      role="progressbar"
                      aria-label="success-rate"
                      aria-valuenow={successRate}
                      aria-valuemin="0"
                      aria-valuemax="100"
                      style={{ height: 8 }}
                    >
                      <div className="progress-bar" style={{ width: `${successRate}%`, backgroundColor: palette.violet }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card glass-card h-100">
                  <div className="card-body">
                    <div className="text-muted small">{t("statistics.avg_tx") || "Avg. transactions / file"}</div>
                    <div className="fs-3 fw-bold" style={{ color: palette.blue }}>
                      {avgTx}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="row g-3">
              <div className="col-12">
                <div className="card glass-card h-100">
                  <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0" style={{ color: palette.text }}>
                      {t("statistics.trend") || "Validation trend"}
                    </h5>
                    <div className="btn-group btn-group-sm" role="group" aria-label="range">
                      {[7, 30, 90].map((d) => (
                        <button
                          key={d}
                          className={`btn ${rangeDays === d ? "btn-primary" : "btn-outline-primary"}`}
                          onClick={() => setRangeDays(d)}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="card-body">
                    {tsLoading ? (
                      <div className="text-center text-muted">Loading…</div>
                    ) : tsError ? (
                      <div className="alert alert-warning">{String(tsError)}</div>
                    ) : (
                      <Chart options={areaOptions} series={tsSeries} type="area" height={320} />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-12 col-lg-6">
                <div className="card glass-card h-100">
                  <div className="card-header bg-transparent">
                    <h5 className="card-title mb-0" style={{ color: palette.text }}>
                      {t("statistics.status_distribution") || "Status distribution"}
                    </h5>
                  </div>
                  <div className="card-body">
                    <Chart options={donutOptions} series={donutSeries} type="donut" height={320} />
                  </div>
                </div>
              </div>

              <div className="col-12 col-lg-6">
                <div className="card glass-card h-100">
                  <div className="card-header bg-transparent">
                    <h5 className="card-title mb-0" style={{ color: palette.text }}>
                      {t("statistics.files_overview") || "Files overview"}
                    </h5>
                  </div>
                  <div className="card-body">
                    <Chart options={barOptions} series={barSeries} type="bar" height={320} />
                  </div>
                </div>
              </div>

              <div className="col-12 col-lg-6">
                <div className="card glass-card h-100">
                  <div className="card-header bg-transparent">
                    <h5 className="card-title mb-0" style={{ color: palette.text }}>
                      {t("statistics.success_rate") || "Success rate"}
                    </h5>
                  </div>
                  <div className="card-body d-flex justify-content-center">
                    <Chart options={radialOptions} series={radialSeries} type="radialBar" height={300} />
                  </div>
                </div>
              </div>

              <div className="col-12 col-lg-6">
                <div className="card glass-card h-100">
                  <div className="card-header bg-transparent">
                    <h5 className="card-title mb-0" style={{ color: palette.text }}>
                      {t("statistics.avg_tx") || "Avg. transactions per file"}
                    </h5>
                  </div>
                  <div className="card-body d-flex align-items-center justify-content-center fs-3 fw-bold">
                    {avgTx}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
