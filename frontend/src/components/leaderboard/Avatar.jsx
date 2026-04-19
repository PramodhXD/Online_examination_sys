const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-fuchsia-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

function colorForName(name) {
  const text = String(name || "").trim().toLowerCase();
  if (!text) {
    return AVATAR_COLORS[0];
  }

  const total = [...text].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_COLORS[total % AVATAR_COLORS.length];
}

export default function Avatar({ name }) {
  const label = String(name || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white ${colorForName(name)}`}
      aria-hidden="true"
    >
      {label}
    </div>
  );
}
