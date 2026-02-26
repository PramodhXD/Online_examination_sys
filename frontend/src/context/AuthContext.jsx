import React, { useEffect, useState } from "react";
import { getCurrentUser } from "../services/authService";
import { AuthContext } from "./auth-context";

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

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
          role: profile.role,
        };

        setUser(normalizedUser);
        localStorage.setItem("auth_user", JSON.stringify(normalizedUser));
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
    setUser(userData);
    setToken(authToken);

    localStorage.setItem("auth_user", JSON.stringify(userData));
    localStorage.setItem("auth_token", authToken);
    if (userData?.email) {
      localStorage.setItem("userEmail", userData.email);
    }
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
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
