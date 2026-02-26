import { useEffect, useState } from "react";
import DashboardLayout from "../../components/dashboard/layout/DashboardLayout";
import certificateService from "../../services/certificateService";
import { getErrorMessage } from "../../utils/errorMessage";

function savePdfBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function Certificates() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadCertificates = async () => {
      try {
        setError("");
        const data = await certificateService.getAssessmentCertificates();
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        setItems([]);
        if (err?.response?.status === 403) {
          setError(getErrorMessage(err, "Certificates require an eligible subscription and admin issuance."));
        }
      } finally {
        setLoading(false);
      }
    };

    loadCertificates();
  }, []);

  const downloadCertificate = async (item) => {
    try {
      setDownloadingId(item.attempt_id);
      const blob = await certificateService.downloadAssessmentCertificate(item.attempt_id);
      savePdfBlob(blob, `certificate_${item.assessment_title}_${item.attempt_id}.pdf`);
    } catch (err) {
      if (err?.response?.status === 403) {
        setError(getErrorMessage(err, "Certificate download is allowed after admin issues it."));
      }
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Certificates</h2>
          <p className="text-gray-600 mt-2">Download certificates issued by admin for your passed assessments.</p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-slate-500">
            Loading certificates...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-amber-800">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-slate-600">
            No certificates available yet. Certificates appear after you pass and admin issues them.
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((item) => (
              <div
                key={item.attempt_id}
                className="rounded-xl border border-slate-200 bg-white px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <p className="text-base font-semibold text-slate-900">{item.assessment_title}</p>
                  <p className="text-sm text-slate-600">
                    Score: {item.percentage}% ({item.score}/{item.total})
                  </p>
                  <p className="text-xs text-slate-500">
                    Issued: {new Date(item.completed_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => downloadCertificate(item)}
                  disabled={downloadingId === item.attempt_id}
                  className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {downloadingId === item.attempt_id ? "Downloading..." : "Download PDF"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
