import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import * as Motion from "framer-motion";
import DashboardLayout from "../../components/dashboard/layout/DashboardLayout";
import {
  changePassword,
  deleteAccount,
  getProfile,
  updateProfile,
} from "../../services/userService";

export default function Profile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [avatarUrl, setAvatarUrl] = useState("");

  const getAvatarStorageKey = (email) =>
    email ? `user_avatar_${email.toLowerCase()}` : "user_avatar";

  // 🔥 Fetch Profile From Backend
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getProfile();
        setProfile(data);
        setFormData({ name: data.name });
        setAvatarUrl(localStorage.getItem(getAvatarStorageKey(data.email)) || "");
      } catch { void 0; } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, []);

  const handleUpdate = async () => {
    try {
      await updateProfile({ name: formData.name });

      setProfile((prev) => ({
        ...prev,
        name: formData.name,
      }));

      setShowEditModal(false);
    } catch {
      alert("Failed to update profile");
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await deleteAccount();
      localStorage.clear();
      navigate("/login");
    } catch (error) { void error;
      alert(
        error?.response?.data?.detail ||
          error?.message ||
          "Failed to delete account."
      );
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.email) return;

    if (!file.type.startsWith("image/")) {
      alert("Please choose a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      setAvatarUrl(value);
      localStorage.setItem(getAvatarStorageKey(profile.email), value);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarRemove = () => {
    if (!profile?.email) return;
    setAvatarUrl("");
    localStorage.removeItem(getAvatarStorageKey(profile.email));
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }
    if (passwordForm.new_password.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    try {
      setSavingPassword(true);
      await changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordSuccess("Password changed successfully.");
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      setTimeout(() => setShowPasswordModal(false), 900);
    } catch (error) { void error;
      setPasswordError(
        error?.response?.data?.detail ||
          error?.message ||
          "Failed to change password."
      );
    } finally {
      setSavingPassword(false);
    }
  };

  if (loadingProfile) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-gray-500">
          Loading profile...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-10">

        {/* Page Title */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            My Profile
          </h2>
          <p className="text-gray-600 mt-2">
            View and manage your personal information.
          </p>
        </div>

        {/* 🔥 Animated Header */}
        <Motion.motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          whileHover={{ scale: 1.01 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 
                     text-white rounded-2xl p-6 shadow-xl 
                     flex items-center gap-6"
        >
          <div className="flex flex-col items-center gap-3">
            <Motion.motion.div
              whileHover={{ rotate: 5, scale: 1.05 }}
              className="w-24 h-24 rounded-full bg-white text-blue-600 
                         flex items-center justify-center text-3xl 
                         font-bold shadow-lg overflow-hidden"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile avatar" className="w-full h-full object-cover" />
              ) : (
                profile?.name?.charAt(0)
              )}
            </Motion.motion.div>

            <label className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full cursor-pointer transition">
              Change Avatar
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>

            {avatarUrl && (
              <button
                type="button"
                onClick={handleAvatarRemove}
                className="text-xs underline text-white/90 hover:text-white"
              >
                Remove
              </button>
            )}
          </div>

          <div>
            <h3 className="text-2xl font-bold">
              {profile?.name}
            </h3>
            <p className="opacity-90">
              {profile?.email}
            </p>

            <span className="mt-3 inline-block bg-green-500 
                             text-white text-xs px-3 py-1 rounded-full">
              Face Verified
            </span>
          </div>
        </Motion.motion.div>

        {/* Info Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border">
          <h4 className="text-lg font-semibold mb-6 border-b pb-2">
            Personal Information
          </h4>

          <div className="space-y-4 text-sm">
            <div>
              <p className="text-gray-500">Roll Number</p>
              <p className="font-medium text-gray-800">
                {profile?.roll_number}
              </p>
            </div>

            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-medium text-gray-800">
                {profile?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Action Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border 
                        flex items-center justify-between">

          <button
            onClick={() => setShowEditModal(true)}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl 
                       font-medium hover:bg-blue-700 transition 
                       hover:scale-105 active:scale-95"
          >
            Edit Name
          </button>

          <div className="flex items-center gap-5">
            <button
              onClick={() => {
                setPasswordError("");
                setPasswordSuccess("");
                setPasswordForm({
                  current_password: "",
                  new_password: "",
                  confirm_password: "",
                });
                setShowPasswordModal(true);
              }}
              className="text-blue-600 text-sm font-medium hover:text-blue-800 transition"
            >
              Change Password
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-red-600 text-sm font-medium 
                         hover:text-red-800 transition"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* 📝 Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <Motion.motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 
                       flex items-center justify-center z-50"
          >
            <Motion.motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-white rounded-2xl p-6 w-[400px] shadow-2xl"
            >
              <h3 className="text-lg font-semibold mb-4">
                Edit Name
              </h3>

              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ name: e.target.value })
                }
                className="w-full border rounded-lg p-2"
              />

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>

                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Save
                </button>
              </div>
            </Motion.motion.div>
          </Motion.motion.div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <Motion.motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          >
            <Motion.motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-white rounded-2xl p-6 w-[420px] shadow-2xl"
            >
              <h3 className="text-lg font-semibold mb-2">
                Change Password
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter your current password and choose a new one.
              </p>

              <div className="space-y-3">
                <input
                  type="password"
                  placeholder="Current password"
                  value={passwordForm.current_password}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      current_password: e.target.value,
                    }))
                  }
                  className="w-full border rounded-lg p-2"
                />
                <input
                  type="password"
                  placeholder="New password"
                  value={passwordForm.new_password}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      new_password: e.target.value,
                    }))
                  }
                  className="w-full border rounded-lg p-2"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={passwordForm.confirm_password}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirm_password: e.target.value,
                    }))
                  }
                  className="w-full border rounded-lg p-2"
                />
              </div>

              {passwordError && (
                <p className="text-sm text-red-600 mt-3">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-sm text-green-600 mt-3">{passwordSuccess}</p>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={savingPassword}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-70"
                >
                  {savingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </Motion.motion.div>
          </Motion.motion.div>
        )}
      </AnimatePresence>

      {/* ❌ Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <Motion.motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 
                       flex items-center justify-center z-50"
          >
            <Motion.motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-white rounded-2xl p-6 w-[400px] shadow-2xl"
            >
              <h3 className="text-lg font-semibold mb-2">
                Delete Account
              </h3>

              <p className="text-sm text-gray-600 mb-6">
                This action cannot be undone. Are you sure?
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>

                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg"
                >
                  {loading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </Motion.motion.div>
          </Motion.motion.div>
        )}
      </AnimatePresence>

    </DashboardLayout>
  );
}




