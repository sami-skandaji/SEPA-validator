import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./components/Login";
import Signup from "./components/Signup";
import Dashboard from "./components/Dashboard";
import Upload from "./components/Upload";
import PrivateRoute from "./PrivateRoute";
import SepaDetailPage from "./components/SepaDetailPage";
import UploadZip from "./components/UploadZip";
import Statistics from "./pages/Statistics";
import AdminDashboard from "./pages/AdminDashboard";

import RoleGuard from "./components/RoleGuard";
import AccountPage from "./pages/AccountPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";

import AppLayout from "./components/AppLayout"; // ✅ layout avec Navbar + Sidebar

function App() {
  return (
    <Router>
      <Routes>
        {/* Routes publiques (pas de Navbar ici) */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Routes privées avec Navbar + Sidebar via AppLayout */}
        <Route
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/upload-zip" element={<UploadZip />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/password" element={<ChangePasswordPage />} />
          <Route path="/sepa/:id" element={<SepaDetailPage />} />

          {/* Admin protégé */}
          <Route
            path="/admin"
            element={
              <RoleGuard need="ADMIN">
                <AdminDashboard />
              </RoleGuard>
            }
          />
        </Route>

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
