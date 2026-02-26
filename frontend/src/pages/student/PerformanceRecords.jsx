import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "../../components/dashboard/layout/DashboardLayout";
import performanceService from "../../services/performanceService";
import { Download } from "lucide-react";

export default function PerformanceRecords() {

  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 5;
  const isFinalStatus = (status) =>
    ["COMPLETED", "VIOLATION_SUBMITTED"].includes(String(status || "").toUpperCase());

  const formatStatusLabel = (status) => {
    const normalized = String(status || "").toUpperCase();
    if (normalized === "VIOLATION_SUBMITTED") return "Violation Submitted";
    if (normalized === "IN_PROGRESS") return "In Progress";
    return normalized;
  };

  // ================= FETCH PERFORMANCE =================
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await performanceService.getHistory();
        setAttempts(data.attempts || []);
      } catch { void 0; } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // ================= FILTER + SORT =================
  const filteredData = useMemo(() => {
    let data = [...attempts];

    data = data.filter((a) =>
      a.exam_name.toLowerCase().includes(search.toLowerCase()) &&
      (typeFilter === "All" || a.type === typeFilter)
    );

    data.sort((a, b) =>
      sortOrder === "asc"
        ? (a.score || 0) - (b.score || 0)
        : (b.score || 0) - (a.score || 0)
    );

    return data;
  }, [attempts, search, typeFilter, sortOrder]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, sortOrder]);

  // ================= PAGINATION =================
  const totalPages = Math.ceil(filteredData.length / pageSize);

  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // ================= EXPORT =================
  const exportPDF = (attempt) => {
    const content = `
Exam: ${attempt.exam_name}
Type: ${attempt.type}
Date: ${new Date(attempt.date).toLocaleString()}
Score: ${isFinalStatus(attempt.status) ? attempt.score + "%" : "N/A"}
Status: ${formatStatusLabel(attempt.status)}
`;

    const blob = new Blob([content], {
      type: "text/plain;charset=utf-8;"
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${attempt.exam_name}.txt`;
    link.click();
  };

  // ================= LOADING =================
  if (loading) {
    return (
      <DashboardLayout title="Performance Records">
        <div className="p-8 text-gray-500">
          Loading performance records...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Performance Records">

      <div className="space-y-8">

        {/* HEADER */}
        <div>
          <h2 className="text-2xl font-semibold">
            Performance Records
          </h2>
          <p className="text-gray-500">
            View completed and in-progress exams.
          </p>
        </div>

        {/* FILTERS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-wrap gap-4">

          <input
            type="text"
            placeholder="Search exam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="All">All Types</option>
            <option value="Practice">Practice</option>
            <option value="Assessment">Assessment</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="desc">High → Low</option>
            <option value="asc">Low → High</option>
          </select>

        </div>

        {/* TABLE */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">

          {paginatedData.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No performance records found.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="py-3 text-left">Exam</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {paginatedData.map((a) => (
                  <tr
                    key={`${a.type}-${a.id}`}
                    className="border-b hover:bg-gray-50 transition"
                  >
                    <td className="py-3">{a.exam_name}</td>
                    <td>{a.type}</td>
                    <td>{new Date(a.date).toLocaleDateString()}</td>

                    {/* SCORE COLUMN */}
                    <td className="font-semibold">
                      {isFinalStatus(a.status) ? (
                        <span className="text-indigo-600">
                          {a.score}%
                        </span>
                      ) : (
                        <span className="text-yellow-600">
                          In Progress
                        </span>
                      )}
                    </td>

                    {/* STATUS BADGE */}
                    <td>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          String(a.status || "").toUpperCase() === "VIOLATION_SUBMITTED"
                            ? "bg-red-100 text-red-700"
                            : isFinalStatus(a.status)
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {formatStatusLabel(a.status)}
                      </span>
                    </td>

                    <td>
                      <button
                        onClick={() => exportPDF(a)}
                        className="px-3 py-1 bg-gray-800 text-white rounded text-xs flex items-center gap-1"
                      >
                        <Download size={14} /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-1 rounded ${
                  currentPage === i + 1
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}



