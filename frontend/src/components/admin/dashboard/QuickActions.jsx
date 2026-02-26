import { PlusCircle, Database, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8">
      <h3 className="text-lg font-bold text-slate-900 mb-4">
        Quick Actions
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        {/* Create Exam */}
        <button
          onClick={() => navigate("/admin/exams")}
          className="flex flex-col items-center justify-center gap-3 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all shadow-lg shadow-blue-200 group"
        >
          <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
            <PlusCircle className="w-6 h-6" />
          </div>
          <span className="text-sm font-bold">
            Create New Exam
          </span>
        </button>

        {/* Add Questions */}
        <button
          onClick={() => navigate("/admin/questions")}
          className="flex flex-col items-center justify-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl transition-all group"
        >
          <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
            <PlusCircle className="w-6 h-6 text-slate-500" />
          </div>
          <span className="text-sm font-bold">
            Add Questions
          </span>
        </button>

        {/* Upload Question Bank */}
        <button
          onClick={() => navigate("/admin/questions")}
          className="flex flex-col items-center justify-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl transition-all group"
        >
          <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
            <Database className="w-6 h-6 text-slate-500" />
          </div>
          <span className="text-sm font-bold">
            Upload Q-Bank
          </span>
        </button>

        {/* Publish Results */}
        <button
          onClick={() => navigate("/admin/analytics")}
          className="flex flex-col items-center justify-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl transition-all group"
        >
          <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
            <Send className="w-6 h-6 text-slate-500" />
          </div>
          <span className="text-sm font-bold">
            Publish Results
          </span>
        </button>

      </div>
    </div>
  );
}
