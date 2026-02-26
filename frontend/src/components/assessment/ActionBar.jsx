export default function ActionBar({
  onPrev,
  onNext,
  onClear,
  onMark,
  onTogglePalette,
  hasPalette,
}) {
  return (
    <div
      className={`
        fixed bottom-0 left-0 z-30
        bg-white/95 backdrop-blur-md border-t border-slate-200
        flex flex-col sm:flex-row sm:items-center sm:justify-between
        gap-3 px-4 sm:px-6 py-3
        ${hasPalette ? "right-0 lg:right-72" : "right-0"}
      `}
    >
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onMark}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Mark for Review
        </button>

        <button
          onClick={onClear}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Clear Response
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {!hasPalette && (
          <button
            onClick={onTogglePalette}
            className="px-3 sm:px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Show Palette
          </button>
        )}

        <button
          onClick={onPrev}
          className="px-4 sm:px-5 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Previous
        </button>

        <button
          onClick={onNext}
          className="px-5 sm:px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
        >
          Save & Next
        </button>
      </div>
    </div>
  );
}
