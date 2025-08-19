// src/api/account.js
import axiosInstance from "../axiosInstance";

export const getMe = () => axiosInstance.get("/api/accounts/me/");
export const updateMe = (payload) => axiosInstance.put("/api/accounts/me/update/", payload);
export const changePassword = (payload) => axiosInstance.post("/api/accounts/me/change-password/", payload);
