import { Calculator, Brain, BookOpen, Code } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import DashboardLayout from "../../components/dashboard/layout/DashboardLayout";
import practiceService from "../../services/practiceService";

function isUnlimitedAttemptLimit(limit) {
  return Number(limit) === 0;
}

export default function Practice() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await practiceService.getCategories();
        setCategories(data);
      } catch {
        void 0;
      }
    };

    fetchCategories();
  }, []);

  const handleStartPractice = (categoryId) => {
    navigate(`/practice/instructions?category=${categoryId}`);
  };

  const getIcon = (name) => {
    if (name.includes("Quantitative")) return Calculator;
    if (name.includes("Reasoning")) return Brain;
    if (name.includes("Verbal")) return BookOpen;
    if (name.includes("Technical")) return Code;
    return BookOpen;
  };

  const getColor = (name) => {
    if (name.includes("Quantitative")) return "bg-blue-100 text-blue-600";
    if (name.includes("Reasoning")) return "bg-purple-100 text-purple-600";
    if (name.includes("Verbal")) return "bg-green-100 text-green-600";
    if (name.includes("Technical")) return "bg-orange-100 text-orange-600";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-gray-900">Practice Tests</h2>
          <p className="text-gray-600 mt-2">Practice section-wise tests to improve your skills.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {categories.map((category) => {
            const Icon = getIcon(category.name);
            const unlimited = isUnlimitedAttemptLimit(category.attempt_limit);
            return (
              <div
                key={category.id}
                className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${getColor(category.name)}`}>
                  <Icon size={24} />
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                <p className="text-sm text-gray-600 mb-6">
                  Attempt limit: <strong>{unlimited ? "Unlimited" : (category.attempt_limit ?? 1)}</strong> | Used: <strong>{category.attempts_used ?? 0}</strong> | Left: <strong>{unlimited ? "Unlimited" : (category.attempts_left ?? 0)}</strong>
                </p>

                <button
                  disabled={Boolean(category.limit_reached)}
                  onClick={() => handleStartPractice(category.id)}
                  className={`w-full py-2.5 rounded-lg font-medium transition ${
                    category.limit_reached
                      ? "bg-slate-300 text-slate-600 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {category.limit_reached ? "Attempt Limit Reached" : "Start Practice"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
