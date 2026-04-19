import { Bell, CheckCheck, ExternalLink, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

function formatTimestamp(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getTypeClasses(type, isRead) {
  if (type === "success") {
    return isRead
      ? "border-emerald-200 bg-white dark:border-slate-700 dark:bg-slate-900"
      : "border-emerald-200 bg-emerald-50 dark:border-emerald-900/70 dark:bg-emerald-950/30";
  }

  if (type === "warning") {
    return isRead
      ? "border-amber-200 bg-white dark:border-slate-700 dark:bg-slate-900"
      : "border-amber-200 bg-amber-50 dark:border-amber-900/70 dark:bg-amber-950/30";
  }

  return isRead
    ? "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
    : "border-blue-200 bg-blue-50 dark:border-blue-900/70 dark:bg-blue-950/30";
}

export default function NotificationPanel({
  notifications,
  loading,
  unreadCount,
  onMarkAsRead,
  onDelete,
  compact = false,
  onNavigateAway,
}) {
  const navigate = useNavigate();

  const visibleNotifications = compact ? notifications.slice(0, 5) : notifications;

  const handleOpen = async (notification) => {
    if (!notification?.is_read && typeof onMarkAsRead === "function") {
      try {
        await onMarkAsRead(notification.id);
      } catch { void 0; }
    }

    if (typeof onNavigateAway === "function") {
      onNavigateAway();
    }

    if (notification?.link) {
      navigate(notification.link);
    }
  };

  const handleDelete = async (event, notificationId) => {
    event.stopPropagation();
    if (typeof onDelete !== "function") {
      return;
    }

    try {
      await onDelete(notificationId);
    } catch {
      void 0;
    }
  };

  return (
    <div className={compact ? "w-full" : "mx-auto w-full max-w-4xl"}>
      <div className={compact ? "px-4 py-3 border-b border-slate-200 dark:border-slate-700" : "mb-6 flex items-start justify-between gap-4"}>
        <div>
          <h2 className={compact ? "text-sm font-semibold text-slate-900 dark:text-slate-100" : "text-3xl font-bold text-slate-900 dark:text-white"}>
            Notifications
          </h2>
          <p className={compact ? "mt-1 text-xs text-slate-500 dark:text-slate-400" : "mt-2 text-sm text-slate-600 dark:text-slate-400"}>
            {unreadCount > 0
              ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
              : "You are all caught up"}
          </p>
        </div>
      </div>

      {loading && visibleNotifications.length === 0 ? (
        <div className={compact ? "px-4 py-8 text-sm text-slate-500 dark:text-slate-400" : "rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"}>
          Loading notifications...
        </div>
      ) : null}

      {!loading && visibleNotifications.length === 0 ? (
        <div className={compact ? "px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400" : "rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900"}>
          <Bell className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-base font-medium text-slate-700 dark:text-slate-200">
            No notifications yet
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            New account activity and support updates will appear here.
          </p>
        </div>
      ) : null}

      {visibleNotifications.length > 0 ? (
        <div className={compact ? "max-h-96 overflow-y-auto px-3 py-3 space-y-3" : "space-y-4"}>
          {visibleNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-2xl border p-4 shadow-sm transition ${getTypeClasses(notification.type, notification.is_read)}`}
            >
              <div className={compact ? "space-y-3" : "flex items-start justify-between gap-3"}>
                <div className="min-w-0 flex-1">
                  <div className={`flex items-center gap-2 ${compact ? "justify-between" : ""}`}>
                    <div className="min-w-0 flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {notification.title}
                      </p>
                      {!notification.is_read ? (
                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
                      ) : null}
                    </div>
                  </div>
                  <p className={`mt-2 text-sm text-slate-600 dark:text-slate-300 ${compact ? "leading-7" : "leading-6"}`}>
                    {notification.message}
                  </p>
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    {formatTimestamp(notification.created_at)}
                  </p>
                </div>

                <div className={`flex gap-2 ${compact ? "flex-wrap" : "shrink-0 items-center"}`}>
                  <button
                    type="button"
                    onClick={(event) => handleDelete(event, notification.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/70 dark:text-red-300 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>

                  {!notification.is_read ? (
                    <button
                      type="button"
                      onClick={() => onMarkAsRead(notification.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Read
                    </button>
                  ) : null}

                  {notification.link ? (
                    <button
                      type="button"
                      onClick={() => handleOpen(notification)}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                    >
                      Open
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {compact ? (
        <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
          <button
            type="button"
            onClick={() => {
              if (typeof onNavigateAway === "function") {
                onNavigateAway();
              }
              navigate("/notifications");
            }}
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            View all notifications
          </button>
        </div>
      ) : null}
    </div>
  );
}
