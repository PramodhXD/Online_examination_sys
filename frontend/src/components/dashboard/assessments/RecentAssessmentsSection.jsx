import { useNavigate } from "react-router-dom";
import AssessmentsTable from "./AssessmentsTable";

export default function RecentAssessmentsSection({ assessments = [] }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-slate-800 mt-8 p-6 rounded-2xl shadow-sm border dark:border-slate-700 transition">

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Recent Assessments
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your latest exam activities and results
          </p>
        </div>

        <button
          onClick={() => navigate("/performance")}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          View All →
        </button>
      </div>

      {/* Table */}
      <AssessmentsTable assessments={assessments} />

    </div>
  );
}
