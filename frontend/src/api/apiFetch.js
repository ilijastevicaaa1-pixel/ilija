import { useAuth } from "../auth/AuthContext.jsx";

export async function apiFetch(url, options = {}, customToken) {
  // Dohvati token iz AuthContext-a ili prosleđen
  let token = customToken;
  try {
    // Dinamički import da bi radio i van React komponente
    const { useAuth } = await import("../auth/AuthContext.jsx");
    if (!token) {
      try {
        // Probaj iz localStorage
        token = localStorage.getItem("token");
      } catch {}
    }
  } catch {}
  const headers = { ...(options.headers || {}) };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  if (res.headers.get("content-type")?.includes("application/json")) {
    return await res.json();
  }
  return res;
}
