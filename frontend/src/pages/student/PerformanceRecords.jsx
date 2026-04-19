import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/dashboard/layout/DashboardLayout";
import performanceService from "../../services/performanceService";
import { Download } from "lucide-react";

export default function PerformanceRecords() {
  const navigate = useNavigate();

  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("latest");
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 5;

  const normalizeType = (type) => String(type || "").toLowerCase();

  const isFinalStatus = (status) =>
    ["COMPLETED", "VIOLATION_SUBMITTED"].includes(
      String(status || "").toUpperCase()
    );

  const isResumableAttempt = useCallback((attempt) => {
    const type = String(attempt?.type || "").toLowerCase();
    const status = String(attempt?.status || "").toUpperCase();

    if (type === "assessment") {
      return !["COMPLETED", "VIOLATION_SUBMITTED"].includes(status);
    }

    if (type === "practice") {
      return status !== "COMPLETED";
    }

    return false;
  }, []);

  const formatStatusLabel = (status) => {
    const normalized = String(status || "").toUpperCase();
    if (normalized === "VIOLATION_SUBMITTED") return "Violation Submitted";
    if (["IN_PROGRESS", "LIVE", "FLAGGED", "STOPPED"].includes(normalized)) {
      return "In Progress";
    }
    if (!normalized) return "Unknown";
    return normalized.replaceAll("_", " ");
  };

  const getStatusClasses = (status) => {
    const normalized = String(status || "").toUpperCase();
    if (normalized === "VIOLATION_SUBMITTED") return "bg-red-100 text-red-700";
    if (normalized === "COMPLETED") return "bg-green-100 text-green-700";
    return "bg-amber-100 text-amber-700";
  };

  const formatDate = (value) => {
    if (!value) return "Unknown";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleDateString();
  };

  const formatDateTime = (value) => {
    if (!value) return "Unknown";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleString();
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await performanceService.getHistory();
        setAttempts(data.attempts || []);
      } catch {
        void 0;
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const filteredData = useMemo(() => {
    let data = [...attempts];

    data = data.filter((a) => {
      const examName = String(a?.exam_name || "");
      const searchMatch = examName
        .toLowerCase()
        .includes(search.toLowerCase());
      const typeMatch =
        typeFilter === "all" || normalizeType(a?.type) === typeFilter;
      return searchMatch && typeMatch;
    });

    const direction = sortOrder === "oldest" ? 1 : -1;

    data.sort((a, b) => {
      const aTime = new Date(a?.date || 0).getTime();
      const bTime = new Date(b?.date || 0).getTime();

      if (aTime !== bTime) {
        return (aTime - bTime) * direction;
      }

      const aScore = Number(a?.score || 0);
      const bScore = Number(b?.score || 0);
      return (bScore - aScore) * direction;
    });

    return data;
  }, [attempts, search, typeFilter, sortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, sortOrder]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginationItems = useMemo(() => {
    if (totalPages <= 1) {
      return [];
    }

    const items = [];
    const windowSize = 1;
    const start = Math.max(2, currentPage - windowSize);
    const end = Math.min(totalPages - 1, currentPage + windowSize);

    items.push(1);

    if (start > 2) {
      items.push("start-ellipsis");
    }

    for (let page = start; page <= end; page += 1) {
      items.push(page);
    }

    if (end < totalPages - 1) {
      items.push("end-ellipsis");
    }

    if (totalPages > 1) {
      items.push(totalPages);
    }

    return items;
  }, [currentPage, totalPages]);

  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const exportRecord = (attempt) => {
    const examName = String(attempt?.exam_name || "Exam");
    const content = `
Exam: ${examName}
Type: ${attempt.type}
Date: ${formatDateTime(attempt.date)}
Score: ${isFinalStatus(attempt.status) ? `${attempt.score}%` : "N/A"}
Status: ${formatStatusLabel(attempt.status)}
`;

    const blob = new Blob([content], {
      type: "text/plain;charset=utf-8;",
    });

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${examName}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleResume = (attempt) => {
    const categoryId = attempt?.category_id;
    const attemptId = attempt?.id;

    if (!categoryId || !attemptId) return;

    if (String(attempt?.type || "").toLowerCase() === "assessment") {
      navigate(
        `/resume-attempt?type=assessment&category=${categoryId}&attempt=${attemptId}`
      );
      return;
    }

    navigate(
      `/resume-attempt?type=practice&category=${categoryId}&attempt=${attemptId}`
    );
  };

  const handleReview = (attempt) => {
    const attemptId = attempt?.id;
    if (!attemptId) return;
    if (normalizeType(attempt?.type) === "practice") {
      navigate(`/practice/review?attempt=${attemptId}`);
      return;
    }
    navigate(`/assessment/result?attempt=${attemptId}`);
  };

  if (loading) {
    return (
      <DashboardLayout title="Performance Records">
        <div className="p-8 text-gray-500">Loading performance records...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Performance Records">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold">Performance Records</h2>
          <p className="text-gray-500">View completed and in-progress exams.</p>
        </div>

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
            <option value="all">All Types</option>
            <option value="practice">Practice</option>
            <option value="assessment">Assessment</option>
            <option value="programming">Programming</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="latest">Latest - Oldest</option>
            <option value="oldest">Oldest - Latest</option>
          </select>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border overflow-x-auto">
          {paginatedData.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No performance records found.</div>
          ) : (
            <table className="w-full text-sm table-fixed min-w-[980px]">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="py-3 text-left w-[24%]">Exam</th>
                  <th className="w-[14%]">Type</th>
                  <th className="w-[14%]">Date</th>
                  <th className="w-[14%]">Score</th>
                  <th className="w-[16%]">Status</th>
                  <th className="w-[18%]">Action</th>
                </tr>
              </thead>

              <tbody>
                {paginatedData.map((a) => (
                  <tr
                    key={`${a.type}-${a.id}`}
                    className="border-b hover:bg-gray-50 transition"
                  >
                    <td className="py-3 pr-4 font-medium text-gray-800 truncate">
                      {a.exam_name || "Unnamed Exam"}
                    </td>
                    <td>{a.type || "Unknown"}</td>
                    <td>{formatDate(a.date)}</td>
                    <td className="font-semibold text-center">
                      {isFinalStatus(a.status) ? (
                        <span className="text-indigo-600">{a.score}%</span>
                      ) : (
                        <span className="text-amber-700">N/A</span>
                      )}
                    </td>

                    <td className="text-center">
                      <span
                        className={`inline-flex items-center justify-center min-w-[128px] px-3 py-1 text-xs rounded-full ${getStatusClasses(
                          a.status
                        )}`}
                      >
                        {formatStatusLabel(a.status)}
                      </span>
                    </td>

                    <td className="py-3">
                      <div className="flex items-center justify-center gap-2">
                        {isResumableAttempt(a) ? (
                          <button
                            onClick={() => handleResume(a)}
                            className="w-[98px] px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium"
                          >
                            Resume
                          </button>
                        ) : ["assessment", "practice"].includes(normalizeType(a?.type)) && isFinalStatus(a?.status) ? (
                          <button
                            onClick={() => handleReview(a)}
                            className="w-[98px] px-3 py-1 bg-indigo-600 text-white rounded text-xs font-medium"
                          >
                            Review
                          </button>
                        ) : (
                          <span className="w-[98px]" />
                        )}
                        <button
                          onClick={() => exportRecord(a)}
                          className="w-[98px] px-3 py-1 bg-gray-800 text-white rounded text-xs font-medium inline-flex items-center justify-center gap-1"
                        >
                          <Download size={14} /> TXT
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>

            {paginationItems.map((item, index) => (
              typeof item === "number" ? (
              <button
                key={item}
                onClick={() => setCurrentPage(item)}
                className={`min-w-10 rounded-lg px-3 py-1.5 text-sm ${
                  currentPage === item ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800"
                }`}
              >
                {item}
              </button>
              ) : (
              <button
                key={`${item}-${index}`}
                type="button"
                disabled
                className="min-w-10 rounded-lg px-3 py-1.5 text-sm text-gray-400"
              >
                ...
              </button>
              )
            ))}

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
