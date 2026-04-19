import React, { useEffect, useState } from "react";
import { getCurrentUser } from "../services/authService";
import { AuthContext } from "./auth-context";

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistUser = (nextUser) => {
    setUser(nextUser);
    if (nextUser) {
      localStorage.setItem("auth_user", JSON.stringify(nextUser));
      if (nextUser.email) {
        localStorage.setItem("userEmail", nextUser.email);
      }
      return;
    }

    localStorage.removeItem("auth_user");
    localStorage.removeItem("userEmail");
  };

  // Load auth state from localStorage on app start
  useEffect(() => {
    const bootstrapAuth = async () => {
      const storedUser = localStorage.getItem("auth_user");
      const storedToken = localStorage.getItem("auth_token");

      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        setToken(storedToken);

        const profile = await getCurrentUser();
        const normalizedUser = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          roll_number: profile.roll_number,
          course: profile.course,
          batch: profile.batch,
          role: profile.role,
          face_verified: profile.face_verified,
        };

        persistUser(normalizedUser);
      } catch {
        setUser(null);
        setToken(null);
        localStorage.removeItem("auth_user");
        localStorage.removeItem("auth_token");
        localStorage.removeItem("userEmail");
      } finally {
        setLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  // Login handler
  const login = (userData, authToken) => {
    persistUser(userData);
    setToken(authToken);
    localStorage.setItem("auth_token", authToken);
  };

  const updateUser = (updates) => {
    setUser((prev) => {
      const nextUser = { ...(prev || {}), ...(updates || {}) };
      localStorage.setItem("auth_user", JSON.stringify(nextUser));
      if (nextUser.email) {
        localStorage.setItem("userEmail", nextUser.email);
      }
      return nextUser;
    });
  };

  // Logout handler
  const logout = () => {
    setUser(null);
    setToken(null);

    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("userEmail");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        login,
        updateUser,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
