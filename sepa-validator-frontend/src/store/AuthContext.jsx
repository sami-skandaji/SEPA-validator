// src/store/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { getMe } from "../api/account";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const reloadMe = async () => {
    try {
      const res = await getMe();
      setUser(res.data);
      return res.data;
    } catch {
      setUser(null);
      throw new Error("ME_FAILED");
    }
  };

  useEffect(() => {
    (async () => {
      try { await reloadMe(); }
      catch {}
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, reloadMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
