import * as Motion from "framer-motion";
import { AlertTriangle } from "lucide-react";

export default function QuestionCard({
  question,
  selected,
  onSelect,
  mandatory = false,
  index,
  total,
}) {
  if (!question) return null;

  return (
    <Motion.motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-7 max-w-5xl mx-auto"
    >
      {mandatory && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-yellow-800">
          <AlertTriangle size={18} />
          <span className="text-sm font-medium">This question is mandatory.</span>
        </div>
      )}

      <div className="mb-6">
        <p className="text-xs font-semibold text-blue-700 mb-2 inline-flex rounded-full bg-blue-100 px-2.5 py-1">
          Question {index + 1} of {total}
        </p>
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900 leading-relaxed">
          {question.question_text}
        </h2>
      </div>

      <div className="space-y-3">
        {question.options.map((opt, idx) => {
          const optionValue = idx + 1;
          const isSelected = selected === optionValue;

          return (
            <Motion.motion.label
              key={idx}
              whileHover={{ scale: 1.01 }}
              className={`flex items-center gap-4 cursor-pointer rounded-xl border px-4 py-3.5 transition ${
                isSelected
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                checked={isSelected}
                onChange={() => onSelect(optionValue)}
                className="accent-blue-600 h-4 w-4"
              />

              <span className="text-slate-900 text-sm leading-relaxed">{opt}</span>
            </Motion.motion.label>
          );
        })}
      </div>
    </Motion.motion.div>
  );
}

