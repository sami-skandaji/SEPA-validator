import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../assets/styles.css";
import logo from "../assets/logo.png";

const Signup = () => {
  const [username, setUsername] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [errors, setErrors] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors("");

    if (password1 !== password2) {
      setErrors("Les mots de passe ne correspondent pas.");
      return;
    }

    try {
      const res = await axios.post("http://localhost:8000/api/register/", {
        username,
        password1,
        password2,
      });

      if (res.status === 201 || res.status === 200) {
        navigate("/login");
      }
    } catch (err) {
      if (err.response && err.response.data) {
        const data = err.response.data;
        const firstKey = Object.keys(data)[0];
        setErrors(data[firstKey][0]);
      } else {
        setErrors("Une erreur est survenue.");
      }
    }
  };

  return (
    <div className="container-fluid px-1 px-md-5 px-lg-1 px-xl-5 py-5 mx-auto">
      <div className="card card0 border-0">
        <div className="row d-flex">
          {/* Logo */}
          <div className="col-lg-6 d-flex justify-content-center align-items-center">
            <div className="card1 pb-5">
              <div className="row px-3 justify-content-center border-line">
                <img src={logo} className="image" alt="logo" />
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <div className="col-lg-6">
            <div className="card2 card border-0 px-4 py-5">
              <div className="row px-3 mb-4">
                <h5 className="mb-0 mr-4 mt-2">Register</h5>
              </div>

              {errors && (
                <div className="alert alert-danger" role="alert">
                  {errors}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="row px-3">
                  <label className="mb-1">
                    <h6 className="mb-0 text-sm">Username</h6>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div className="row px-3 mt-3">
                  <label className="mb-1">
                    <h6 className="mb-0 text-sm">Password</h6>
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    value={password1}
                    onChange={(e) => setPassword1(e.target.value)}
                  />
                </div>

                <div className="row px-3 mt-3">
                  <label className="mb-1">
                    <h6 className="mb-0 text-sm">Confirm Password</h6>
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                  />
                </div>

                <div className="row mb-3 px-3 mt-4">
                  <button type="submit" className="btn btn-blue text-center">
                    Register
                  </button>
                </div>

                <div className="row mb-4 px-3">
                  <small className="font-weight-bold">
                    Already have an account?{" "}
                    <a className="text-danger" href="/login">
                      Login
                    </a>
                  </small>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-blue py-4 text-center">
          <small className="text-white">© 2025. All rights reserved.</small>
        </div>
      </div>
    </div>
  );
};

export default Signup;
