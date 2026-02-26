import { useNavigate } from "react-router-dom";

export default function AssessmentsTable({ assessments = [] }) {
  const navigate = useNavigate();

  const getScoreColor = (score) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-blue-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusBadge = (status) => {
    const normalized = String(status || "").toUpperCase();
    if (normalized === "VIOLATION_SUBMITTED")
      return "bg-red-100 text-red-700";
    if (normalized === "COMPLETED")
      return "bg-green-100 text-green-700";
    if (normalized === "IN_PROGRESS")
      return "bg-yellow-100 text-yellow-700";
    return "bg-gray-100 text-gray-700";
  };

  const getStatusLabel = (status) => {
    const normalized = String(status || "").toUpperCase();
    if (normalized === "VIOLATION_SUBMITTED") return "Violation Submitted";
    if (normalized === "IN_PROGRESS") return "In Progress";
    return normalized;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">

        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-slate-700">
            <th className="py-3">Exam Name</th>
            <th className="py-3">Date</th>
            <th className="py-3">Score</th>
            <th className="py-3">Status</th>
          </tr>
        </thead>

        <tbody>
          {assessments.length > 0 ? (
            assessments.map((exam, index) => (
              <tr
                key={index}
                onClick={() => navigate("/performance")}
                className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition"
              >
                <td className="py-3 font-medium text-gray-800 dark:text-white">
                  {exam.exam_name}
                </td>

                <td className="py-3 text-gray-600 dark:text-gray-300">
                  {formatDate(exam.date)}
                </td>

                <td
                  className={`py-3 font-semibold ${
                    exam.score !== null ? getScoreColor(exam.score) : ""
                  }`}
                >
                  {exam.score !== null ? `${exam.score}%` : "-"}
                </td>

                <td className="py-3">
                  <span
                    className={`px-3 py-1 text-xs rounded-full font-medium ${getStatusBadge(
                      exam.status
                    )}`}
                  >
                    {getStatusLabel(exam.status)}
                  </span>
                </td>

              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan="4"
                className="py-6 text-center text-gray-500 dark:text-gray-400"
              >
                No recent assessments available.
              </td>
            </tr>
          )}
        </tbody>

      </table>
    </div>
  );
}
