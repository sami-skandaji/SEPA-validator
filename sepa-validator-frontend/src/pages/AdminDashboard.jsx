import React, {useEffect, useState} from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function AdminDashboard() {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        try {
            const response = await axios.get("http://localhost:8000/api/results/", {
                headers: {
                    Authorization: `Token ${localStorage.getItem("token")}`,
                },
            });
            setFiles(response.data);
        } catch (error) {
            console.error("Erreur lors du chargement des fichiers : ", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (fileId) => {
        if (!window.confirm("supprimer ce fichier ?")) return;
        try {
            await axios.delete(`http://localhost:8000/api/results/${fileId}/delete/`, {
                headers: {
                    Authorization: `Token ${localStorage.getItem("token")}`,
                },
            });
            setFiles((prev) => prev.filter((f) => f.id !== fileId));
        } catch (error) {
            console.error("Erreur lors de la suppression :", error);
        }
    };

    const handleDetails = (fileId) => {
        navigate(`/details/${fileId}`);
    };

    if (loading) return <p>Chargement...</p>

    return (
        <div className="container">
            <h2>Tableau de bord Admin</h2>
            <table>
                <thead>
                    <tr>
                        <th>Nom du fichier</th>
                        <th>Date d'upload</th>
                        <th>Validité</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {files.map((file) => (
                        <tr key={file.id}>
                            <td>{file.id}</td>
                            <td>{new Date(file.upload_date).toString()}</td>
                            <td>{file.is_valid ? "Oui" : "Non"}</td>
                            <td>
                                <button onClick={() => handleDetails(file.id)}>details</button>
                                <button onClick={() => handleDelete(file.id)}>Supprimer</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default AdminDashboard;