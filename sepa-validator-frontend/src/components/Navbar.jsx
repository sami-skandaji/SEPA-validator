import React from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles.css"

const Navbar = ({username}) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login");
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-light bg-light">
            <button
                className="navbar-brand font-weight-bold btn btn-link"
                onClick={() => navigate("/dashboard")}
                style={{ textDecoration: "none" }}
            >
                SEPA Validator
            </button>
            <div className="collapse navbar-collapse justify-content-end">
                <span className="navbar-text mr-3">
                    Connecté en tant que <strong>{username}</strong>
                </span>
                <button
                    onClick={handleLogout}
                    className="btn btn-outline-danger"
                    >
                        Déconnexion
                    </button>
            </div>
        </nav>
    );
};

export default Navbar;