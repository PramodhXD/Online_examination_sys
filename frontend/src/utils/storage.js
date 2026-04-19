export function safeJsonParse(value, fallback = null) {
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function getStoredAuthUser() {
  return safeJsonParse(localStorage.getItem("auth_user"), null);
}

