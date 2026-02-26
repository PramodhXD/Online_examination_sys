import { useNavigate } from "react-router-dom";
import { ShieldCheck, Camera, AlertTriangle, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { getProfile } from "../../services/userService";

export default function ProfileSummaryCard() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);

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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 shadow-sm p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 transition">

      {/* LEFT SECTION */}
      <div className="flex items-center gap-5">

        {/* Profile Image */}
        <button
          type="button"
          onClick={() => navigate("/profile")}
          aria-label="Open profile"
          className="relative cursor-pointer"
        >
          <img
            src="https://randomuser.me/api/portraits/men/32.jpg"
            alt="profile"
            className="w-16 h-16 rounded-xl object-cover"
            loading="lazy"
            decoding="async"
          />

          <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span>
        </button>

        {/* Name + Email + Status */}
        <div>
          <h2
            onClick={() => navigate("/profile")}
            className="text-xl font-semibold text-gray-800 dark:text-white cursor-pointer hover:underline"
          >
            Welcome, {student.name}
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

            <div className="flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs px-3 py-1 rounded-full">
              <AlertTriangle className="w-4 h-4" />
              Warnings: 0/3
            </div>

          </div>
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex flex-wrap gap-3">

        <button
          onClick={() => navigate("/student/face-verification")}
          className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition"
        >
          Re-verify Face
        </button>

        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
        >
          <Lock className="w-4 h-4" />
          Change Password
        </button>

      </div>
    </div>
  );
}




