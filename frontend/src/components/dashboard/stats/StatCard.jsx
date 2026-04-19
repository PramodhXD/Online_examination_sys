export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
  onClick,
  clickable = false,
  action,
}) {
  const displayValue =
    value !== undefined && value !== null ? value : "-";

  const isInteractive = Boolean(clickable && onClick);
  const containerTag = isInteractive ? "button" : "div";
  const Container = containerTag;

  return (
    <Container
      {...(isInteractive ? { type: "button", onClick } : {})}
      className={`
      bg-white dark:bg-slate-800
      rounded-xl
      shadow-sm
      border dark:border-slate-700
      p-4
      min-h-[132px]
      flex flex-col
      justify-between
      ${isInteractive ? "hover:shadow-lg hover:-translate-y-1 cursor-pointer" : ""}
      transition-all duration-300
      text-left w-full
    `}
    >
      
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {title}
        </span>

        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
          {icon}
        </div>
      </div>

      {/* Value */}
      <h3 className="text-xl font-semibold leading-none text-gray-800 dark:text-white">
        {displayValue}
      </h3>

      {/* Subtitle */}
      {subtitle && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {subtitle}
        </p>
      )}

      {action ? (
        <div className="mt-3">
          {action}
        </div>
      ) : null}
    </Container>
  );
}
