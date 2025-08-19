import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function AppLayout() {
  return (
    <div className="bg-app min-vh-100 py-4">
      <div className="container-xxl">
        <div className="row g-4">
          {/* Sidebar */}
          <div className="col-12 col-md-2">
            <Sidebar />
          </div>

          {/* Contenu + Navbar */}
          <div className="col-12 col-md-10">
            <Navbar />
            <main>
              <Outlet />
            </main>
          </div>
        </div>
      </div>

      {/* Offcanvas Notifications */}
      <div
        className="offcanvas offcanvas-end"
        tabIndex="-1"
        id="notificationsOffcanvas"
        aria-labelledby="notificationsOffcanvasLabel"
      >
        <div className="offcanvas-header">
          <h5 className="offcanvas-title" id="notificationsOffcanvasLabel">
            Notifications
          </h5>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          ></button>
        </div>
        <div className="offcanvas-body">
          <p className="text-muted">Aucune notification pour le moment.</p>
        </div>
      </div>
    </div>
  );
}
