import { useEffect, useState } from "react";

import { NotificationContext } from "./notification-context";
import { useAuth } from "../hooks/useAuth";
import {
  deleteNotification,
  getNotifications,
  markNotificationRead,
} from "../services/notificationService";

export default function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    const token = localStorage.getItem("auth_token");
    if (!token) {
      return undefined;
    }

    const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL?.trim() || "/api").replace(/\/+$/, "");
    const resolvedBaseUrl = apiBaseUrl.startsWith("http")
      ? apiBaseUrl
      : `${window.location.origin}${apiBaseUrl.startsWith("/") ? "" : "/"}${apiBaseUrl}`;
    const wsBaseUrl = resolvedBaseUrl.replace(/^http/i, "ws");
    const socket = new WebSocket(`${wsBaseUrl}/notifications/ws?token=${encodeURIComponent(token)}`);

    const pingInterval = window.setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send("ping");
      }
    }, 30000);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type !== "notification.created" || !data?.notification) {
          return;
        }

        const nextNotification = data.notification;
        setNotifications((prev) => {
          const withoutMatch = prev.filter((item) => item.id !== nextNotification.id);
          return [nextNotification, ...withoutMatch].slice(0, 20);
        });
        setUnreadCount((prev) => prev + (nextNotification.is_read ? 0 : 1));
      } catch {
        void 0;
      }
    };

    socket.onclose = () => {
      window.clearInterval(pingInterval);
    };

    return () => {
      window.clearInterval(pingInterval);
      socket.close();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const loadNotifications = async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }

      try {
        const data = await getNotifications(20);
        if (cancelled) {
          return;
        }
        setNotifications(Array.isArray(data?.items) ? data.items : []);
        setUnreadCount(Number(data?.unread_count || 0));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadNotifications(false);
    const intervalId = window.setInterval(() => {
      void loadNotifications(true);
    }, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated]);

  const refreshNotifications = async ({ silent = false } = {}) => {
    if (!isAuthenticated) {
      return;
    }

    if (!silent) {
      setLoading(true);
    }

    try {
      const data = await getNotifications(20);
      setNotifications(Array.isArray(data?.items) ? data.items : []);
      setUnreadCount(Number(data?.unread_count || 0));
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const markAsRead = async (notificationId) => {
    const existing = notifications.find((item) => item.id === notificationId);
    if (!existing || existing.is_read) {
      return existing;
    }

    const response = await markNotificationRead(notificationId);
    const updatedNotification = response?.notification;

    if (!updatedNotification) {
      return existing;
    }

    setNotifications((prev) =>
      prev.map((item) => (
        item.id === notificationId ? updatedNotification : item
      ))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    return updatedNotification;
  };

  const removeNotification = async (notificationId) => {
    const existing = notifications.find((item) => item.id === notificationId);
    if (!existing) {
      return null;
    }

    await deleteNotification(notificationId);
    setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
    setUnreadCount((prev) => Math.max(0, prev - (existing.is_read ? 0 : 1)));
    return notificationId;
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        refreshNotifications,
        markAsRead,
        removeNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
