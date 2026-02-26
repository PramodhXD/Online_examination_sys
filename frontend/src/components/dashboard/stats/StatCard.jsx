export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
  onClick,
  clickable = false,
}) {
  const displayValue =
    value !== undefined && value !== null ? value : "-";

  const isInteractive = Boolean(clickable && onClick);

  return (
    <button
      type="button"
      onClick={isInteractive ? onClick : undefined}
      className={`
      bg-white dark:bg-slate-800
      rounded-2xl
      shadow-sm
      border dark:border-slate-700
      p-5
      ${isInteractive ? "hover:shadow-lg hover:-translate-y-1 cursor-pointer" : ""}
      transition-all duration-300
      text-left w-full
    `}
    >
      
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {title}
        </span>

        <div className={`p-2 rounded-xl ${color}`}>
          {icon}
        </div>
      </div>

      {/* Value */}
      <h3 className="text-2xl font-semibold text-gray-800 dark:text-white">
        {displayValue}
      </h3>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {subtitle}
        </p>
      )}
    </button>
  );
}
