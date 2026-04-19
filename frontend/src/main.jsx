import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import NotificationProvider from "./context/NotificationContext";
import ThemeProvider from "./context/ThemeContext";
import ExamProvider from "./context/ExamContext";
import AppErrorBoundary from "./components/common/AppErrorBoundary";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <ThemeProvider>
            <ExamProvider>
              <AppErrorBoundary>
                <App />
              </AppErrorBoundary>
            </ExamProvider>
          </ThemeProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
