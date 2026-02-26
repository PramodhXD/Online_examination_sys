import {
  CheckCircle,
  XCircle,
  Circle,
  Bookmark,
  BookmarkCheck,
  Send,
  PanelRightClose,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import * as Motion from "framer-motion";
import { useState } from "react";

/* ===============================
   Question Palette
================================ */
export default function QuestionPalette({
  questions,
  current,
  answers,
  visited = {},
  marked = {},
  onJump,
  onSubmit,
  onToggle,
  visible = true,
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  const getStatus = (index) => {
    if (marked[index] && answers[index] !== undefined)
      return "answered_marked";
    if (marked[index]) return "marked";
    if (answers[index] !== undefined) return "answered";
    if (visited[index]) return "not_answered";
    return "not_visited";
  };

  const statusStyles = {
    answered: "bg-green-500 text-white",
    not_answered: "bg-orange-500 text-white",
    not_visited: "bg-gray-200 text-gray-700",
    marked: "bg-purple-500 text-white",
    answered_marked:
      "bg-purple-500 text-white ring-2 ring-green-400",
  };

  return (
    <>
      {/* ================= CONFIRM MODAL ================= */}
      <AnimatePresence>
        {showConfirm && (
          <Motion.motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <Motion.motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white p-8 rounded-xl shadow-2xl text-center max-w-md"
            >
              <h2 className="text-xl font-bold mb-4 text-gray-800">
                Confirm Submission
              </h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to submit the assessment?
              </p>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    onSubmit();
                  }}
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition"
                >
                  Yes, Submit
                </button>

                <button
                  onClick={() => setShowConfirm(false)}
                  className="bg-gray-300 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </Motion.motion.div>
          </Motion.motion.div>
        )}
      </AnimatePresence>

      {/* ================= PALETTE ================= */}
      <AnimatePresence>
        {visible && (
          <Motion.motion.aside
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="w-72 h-full bg-white border-l shadow-xl
                     flex flex-col rounded-l-2xl overflow-hidden"
          >
            {/* ---------- LEGEND ---------- */}
            <div className="p-4 border-b">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <LegendRow
                  icon={<CheckCircle size={16} />}
                  text="Answered"
                  color="text-green-600"
                />
                <LegendRow
                  icon={<XCircle size={16} />}
                  text="Not Answered"
                  color="text-orange-600"
                />
                <LegendRow
                  icon={<Circle size={16} />}
                  text="Not Visited"
                  color="text-gray-500"
                />
                <LegendRow
                  icon={<Bookmark size={16} />}
                  text="Marked for Review"
                  color="text-purple-600"
                />
                <div className="col-span-2">
                  <LegendRow
                    icon={<BookmarkCheck size={16} />}
                    text="Answered & Marked"
                    color="text-purple-600"
                  />
                </div>
              </div>
            </div>

            {/* ---------- HEADER ---------- */}
            <div className="bg-blue-600 text-white px-5 py-3
                          font-semibold flex justify-between items-center">
              <span>Test</span>
              <button
                onClick={onToggle}
                className="hover:bg-blue-500 p-2 rounded-lg transition"
                title="Hide Question Palette"
              >
                <PanelRightClose size={18} />
              </button>
            </div>

            {/* ---------- QUESTION GRID ---------- */}
            <div className="p-5 flex-1 overflow-auto">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Choose a Question
              </h3>

              <div className="grid grid-cols-4 gap-3">
                {questions.map((_, i) => {
                  const status = getStatus(i);

                  return (
                    <Motion.motion.button
                      key={i}
                      onClick={() => onJump(i)}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      className={`h-10 rounded-lg text-sm font-semibold
                      transition shadow-sm
                      ${statusStyles[status]}
                      ${current === i ? "ring-2 ring-blue-600" : ""}
                    `}
                    >
                      {i + 1}
                    </Motion.motion.button>
                  );
                })}
              </div>
            </div>

            {/* ---------- SUBMIT ---------- */}
            <div className="p-5 border-t">
              <Motion.motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowConfirm(true)}
                className="w-full flex items-center justify-center gap-2
                bg-blue-600 text-white py-3 rounded-xl
                font-semibold hover:bg-blue-700 transition shadow-md"
              >
                <Send size={18} />
                Submit Assessment
              </Motion.motion.button>
            </div>
          </Motion.motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

/* ===============================
   Legend Row
================================ */
function LegendRow({ icon, text, color }) {
  return (
    <div className="flex items-center gap-3">
      <span className={color}>{icon}</span>
      <span className="text-gray-700">{text}</span>
    </div>
  );
}

