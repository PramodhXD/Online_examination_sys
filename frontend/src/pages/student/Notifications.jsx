import DashboardLayout from "../../components/dashboard/layout/DashboardLayout";
import NotificationPanel from "../../components/common/NotificationPanel";
import { useNotifications } from "../../hooks/useNotifications";

export default function Notifications() {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    removeNotification,
  } = useNotifications();

  return (
    <DashboardLayout title="Notifications">
      <NotificationPanel
        notifications={notifications}
        unreadCount={unreadCount}
        loading={loading}
        onMarkAsRead={markAsRead}
        onDelete={removeNotification}
      />
    </DashboardLayout>
  );
}
