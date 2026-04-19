import { useEffect, useMemo, useState } from "react";
import {
  Award,
  CalendarDays,
  Download,
  Eye,
  FileCheck2,
  Search,
  Share2,
  ShieldCheck,
  X,
} from "lucide-react";
import DashboardLayout from "../../components/dashboard/layout/DashboardLayout";
import certificateService from "../../services/certificateService";
import { getErrorMessage } from "../../utils/errorMessage";

const PAGE_SIZE = 10;

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

function formatIssueDate(value) {
  if (!value) return "Pending";
  return new Date(value).toLocaleString();
}

function formatIssueDay(value) {
  if (!value) return "Pending";
  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function HeaderCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
        </div>
      </div>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-slate-200" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-48 rounded bg-slate-200" />
              <div className="h-3 w-full rounded bg-slate-100" />
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="h-10 rounded-xl bg-slate-100" />
                <div className="h-10 rounded-xl bg-slate-100" />
                <div className="h-10 rounded-xl bg-slate-100" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScoreBar({ percentage }) {
  const safePercentage = Math.max(0, Math.min(100, Number(percentage || 0)));

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        <span>Score</span>
        <span className="text-blue-700">{safePercentage}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-2.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-700"
          style={{ width: `${safePercentage}%` }}
        />
      </div>
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let page = 1; page <= totalPages; page += 1) {
    pages.push(page);
  }

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-sky-200 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Prev
      </button>
      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
            currentPage === page
              ? "bg-slate-950 text-white shadow-sm"
              : "border border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700"
          }`}
        >
          {page}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-sky-200 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

function PreviewModal({ item, previewUrl, onClose }) {
  if (!item || !previewUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[1.75rem] border border-white/20 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-lg font-semibold text-slate-950">{item.assessment_title}</p>
            <p className="mt-1 text-sm text-slate-500">
              Certificate ID: <span className="font-medium text-slate-700">{item.certificate_id}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 bg-slate-100 p-3">
          <iframe
            title={`${item.assessment_title} certificate`}
            src={previewUrl}
            className="h-full w-full rounded-2xl border border-slate-200 bg-white"
          />
        </div>
      </div>
    </div>
  );
}

function CertificateRow({
  item,
  busy,
  onPreview,
  onDownload,
  onShare,
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,0.95fr)_auto] xl:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm transition duration-300 group-hover:scale-105">
            <Award className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-semibold text-slate-950">
                {item.assessment_title}
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Issued
              </span>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)_minmax(0,1fr)]">
              <div className="min-w-0">
                <ScoreBar percentage={item.percentage} />
                <p className="mt-2 text-xs font-medium text-slate-500">
                  {item.score}/{item.total} marks earned
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Issued On
                </p>
                <p className="mt-1 font-medium text-slate-700">
                  {formatIssueDay(item.completed_at)}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Certificate ID
                </p>
                <p className="mt-1 truncate font-mono text-sm font-medium text-slate-700">
                  {item.certificate_id}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Issued Time
            </p>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-700">
              {formatIssueDate(item.completed_at)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 self-end xl:justify-end xl:self-center">
          <button
            type="button"
            onClick={() => onPreview(item)}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button
            type="button"
            onClick={() => onShare(item)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
          <button
            type="button"
            onClick={() => onDownload(item)}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Download className="h-4 w-4" />
            {busy ? "Working..." : "Download"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Certificates() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const [previewState, setPreviewState] = useState({ item: null, url: "" });

  useEffect(() => {
    const loadCertificates = async () => {
      try {
        setError("");
        const data = await certificateService.getAssessmentCertificates();
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        setItems([]);
        if (err?.response?.status === 403) {
          setError(
            getErrorMessage(
              err,
              "Certificates require an eligible subscription and admin issuance."
            )
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadCertificates();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);

  useEffect(() => {
    return () => {
      if (previewState.url) {
        URL.revokeObjectURL(previewState.url);
      }
    };
  }, [previewState.url]);

  const latestIssuedAt = items.length
    ? items
        .map((item) => item?.completed_at)
        .filter(Boolean)
        .sort((left, right) => new Date(right) - new Date(left))[0]
    : null;

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const visible = items.filter((item) =>
      item.assessment_title?.toLowerCase().includes(normalizedSearch)
    );

    return [...visible].sort((left, right) => {
      if (sortBy === "highest_score") {
        return Number(right.percentage || 0) - Number(left.percentage || 0);
      }
      if (sortBy === "oldest") {
        return new Date(left.completed_at || 0) - new Date(right.completed_at || 0);
      }
      return new Date(right.completed_at || 0) - new Date(left.completed_at || 0);
    });
  }, [items, searchTerm, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const fetchCertificateBlob = async (item) => {
    setBusyId(item.attempt_id);
    try {
      return await certificateService.downloadAssessmentCertificate(item.attempt_id);
    } catch (err) {
      if (err?.response?.status === 403) {
        setError(
          getErrorMessage(err, "Certificate download is allowed after admin issues it.")
        );
      }
      throw err;
    } finally {
      setBusyId(null);
    }
  };

  const closePreview = () => {
    setPreviewState((current) => {
      if (current.url) {
        URL.revokeObjectURL(current.url);
      }
      return { item: null, url: "" };
    });
  };

  const downloadCertificate = async (item) => {
    try {
      const blob = await fetchCertificateBlob(item);
      savePdfBlob(blob, `certificate_${item.assessment_title}_${item.attempt_id}.pdf`);
    } catch {
      void 0;
    }
  };

  const previewCertificate = async (item) => {
    try {
      const blob = await fetchCertificateBlob(item);
      const url = URL.createObjectURL(blob);
      setPreviewState((current) => {
        if (current.url) {
          URL.revokeObjectURL(current.url);
        }
        return { item, url };
      });
    } catch {
      void 0;
    }
  };

  const shareCertificate = async (item) => {
    const shareData = {
      title: `${item.assessment_title} Certificate`,
      text: `View my certificate for ${item.assessment_title}. Certificate ID: ${item.certificate_id}`,
      url: item.verify_url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(
        `${shareData.text}\n${shareData.url}`
      );
      window.alert("Certificate link copied to clipboard.");
    } catch {
      window.alert("Unable to share the certificate right now.");
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 overflow-hidden rounded-[2rem] border border-sky-100 bg-[linear-gradient(135deg,#ffffff_0%,#eef7ff_52%,#f3fff8_100%)] p-6 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/85 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                <Award className="h-4 w-4" />
                Achievement Vault
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                Certificates
              </h2>
              <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
                Browse, preview, share, and download your issued certificates in one compact dashboard view.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[420px]">
              <HeaderCard
                icon={<FileCheck2 className="h-5 w-5" />}
                label="Total Issued"
                value={items.length}
              />
              <HeaderCard
                icon={<CalendarDays className="h-5 w-5" />}
                label="Latest Issue"
                value={latestIssuedAt ? formatIssueDay(latestIssuedAt) : "Pending"}
              />
            </div>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-3 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by assessment name"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          >
            <option value="latest">Latest</option>
            <option value="highest_score">Highest Score</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>

        {loading ? (
          <LoadingRows />
        ) : error ? (
          <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-8 text-amber-800 shadow-sm">
            {error}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Award className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-slate-900">
              {items.length === 0 ? "No certificates yet" : "No matches found"}
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-600">
              {items.length === 0
                ? "Certificates appear here after you pass an eligible assessment and an admin issues the final document."
                : "Try a different assessment name or switch the sort order to find the certificate you need."}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-sm font-medium text-slate-500">
                Showing <span className="font-semibold text-slate-800">{paginatedItems.length}</span> of{" "}
                <span className="font-semibold text-slate-800">{filteredItems.length}</span> certificates
              </p>
            </div>
            <div className="space-y-3">
              {paginatedItems.map((item) => (
                <CertificateRow
                  key={item.attempt_id}
                  item={item}
                  busy={busyId === item.attempt_id}
                  onPreview={previewCertificate}
                  onDownload={downloadCertificate}
                  onShare={shareCertificate}
                />
              ))}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      <PreviewModal
        item={previewState.item}
        previewUrl={previewState.url}
        onClose={closePreview}
      />
    </DashboardLayout>
  );
}
