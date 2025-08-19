import axios from "axios";

// Créer une instance sans en-tête statique
const axiosInstance = axios.create({
  baseURL: "http://localhost:8000",
});

// Injecter dynamiquement le token à chaque requête
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access");
    console.log("Token utilisé :", token);
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur de réponse pour rafraîchir automatiquement le token
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh");
        const res = await axios.post("http://localhost:8000/api/accounts/token/refresh/", {
          refresh: refreshToken,
        });

        const newAccess = res.data.access;
        localStorage.setItem("access", newAccess);

        // Mettre à jour l'en-tête Authorization
        originalRequest.headers["Authorization"] = `Bearer ${newAccess}`;

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.error("Échec du refresh token :", refreshError);
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
