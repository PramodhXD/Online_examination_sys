import { useNavigate } from "react-router-dom";
import { ShieldCheck, Camera, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { changePassword, getProfile } from "../../services/userService";

export default function ProfileSummaryCard() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  // 🔥 Fetch logged-in user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getProfile();
        setStudent(data);
      } catch { void 0; }
    };

    fetchProfile();
  }, []);

  // 🔹 Mask email for privacy
  const maskEmail = (email) => {
    if (!email) return "";
    const [name, domain] = email.split("@");
    return name.slice(0, 2) + "****@" + domain;
  };

  if (!student) {
    return null; // or add loading spinner
  }

  const avatarKey = student?.email
    ? `user_avatar_${student.email.toLowerCase()}`
    : "user_avatar";
  const avatarUrl = localStorage.getItem(avatarKey) || "";
  const avatarInitial = student?.name?.charAt(0)?.toUpperCase() || "S";

  const openPasswordModal = () => {
    setPasswordError("");
    setPasswordSuccess("");
    setPasswordForm({
      current_password: "",
      new_password: "",
      confirm_password: "",
    });
    setShowPasswordModal(true);
  };

  const handleFaceRecapture = () => {
    const studentEmail = (student?.email || "").trim();
    if (!studentEmail) {
      return;
    }
    navigate(`/face-capture?email=${encodeURIComponent(studentEmail)}&mode=update`);
  };

  const submitPasswordChange = async (e) => {
    e.preventDefault();
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
    } catch (error) {
      setPasswordError(error?.response?.data?.detail || "Failed to change password.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 shadow-sm p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 transition">

      {/* LEFT SECTION */}
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => navigate("/profile")}
          aria-label="Open profile"
          className="relative w-16 h-16 rounded-xl bg-blue-600 text-white flex items-center justify-center text-2xl font-semibold cursor-pointer overflow-hidden"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile avatar" className="w-full h-full object-cover" loading="lazy" decoding="async" />
          ) : (
            avatarInitial
          )}
          <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
        </button>

        {/* Name + Email + Status */}
        <div>
          <h2
            onClick={() => navigate("/profile")}
            className="text-xl font-semibold text-gray-800 dark:text-white cursor-pointer hover:underline"
          >
            Welcome, {student.name} 👋
          </h2>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            {maskEmail(student.email)}
          </p>

          {/* Status Badges (Static for now) */}
          <div className="flex flex-wrap gap-3 mt-3">

            <div className="flex items-center gap-1 bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full">
              <ShieldCheck className="w-4 h-4" />
              Face Verified
            </div>

            <div className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full">
              <Camera className="w-4 h-4" />
              Camera Active
            </div>

          </div>
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex flex-wrap gap-3">

        <button
          onClick={handleFaceRecapture}
          disabled={!student?.email}
          className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition"
        >
          Re-verify Face
        </button>

        <button
          onClick={openPasswordModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
        >
          <Lock className="w-4 h-4" />
          Change Password
        </button>

      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-xl p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Change Password
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
              Enter your current password and set a new one.
            </p>

            <form onSubmit={submitPasswordChange} className="space-y-3">
              <input
                type="password"
                placeholder="Current password"
                value={passwordForm.current_password}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="password"
                placeholder="New password"
                value={passwordForm.new_password}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={passwordForm.confirm_password}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                required
              />

              {passwordError && (
                <p className="text-sm text-red-600">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-sm text-green-600">{passwordSuccess}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-70"
                >
                  {savingPassword ? "Saving..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



