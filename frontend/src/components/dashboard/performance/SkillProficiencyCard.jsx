import { Download, TrendingUp } from "lucide-react";
import WeakAreaAlert from "./WeakAreaAlert";
import PerformanceCoach from "./PerformanceCoach";

export default function SkillProficiencyCard({
  skills = [],
  onDownloadReport,
  downloadingReport = false,
}) {

  // Safety fallback
  const skillData = skills?.length
    ? skills.map(skill => ({
        name: skill.skill_name,
        value: Math.round(skill.score),
      }))
    : [];

  // Find weakest & strongest skill (for AI recommendation)
  const weakest = skillData.length
    ? skillData.reduce((min, s) => (s.value < min.value ? s : min))
    : null;

  const strongest = skillData.length
    ? skillData.reduce((max, s) => (s.value > max.value ? s : max))
    : null;
  const weakSkills = skillData.filter((skill) => skill.value < 40);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-700 p-6 transition">

      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          Skill Proficiency
        </h3>
      </div>

      {/* Skill Bars */}
      <div className="space-y-5">
        {skillData.map((skill, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span>{skill.name}</span>
              <span>{skill.value}%</span>
            </div>

            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-700"
                style={{ width: `${skill.value}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        <WeakAreaAlert weakSkills={weakSkills} />
        <PerformanceCoach strongestSkill={strongest} weakestSkill={weakest} />
      </div>

      {/* Divider */}
      <div className="my-6 border-t dark:border-slate-600"></div>

      {/* Download Button */}
      <button
        type="button"
        onClick={onDownloadReport}
        disabled={downloadingReport}
        className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition"
      >
        <span className="inline-flex items-center justify-center gap-2">
          <Download className="h-4 w-4" />
          {downloadingReport ? "Preparing PDF..." : "Download Report (PDF)"}
        </span>
      </button>

    </div>
  );
}
