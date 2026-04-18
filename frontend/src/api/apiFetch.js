import { useAuth } from "../auth/AuthContext.jsx";

export async function apiFetch(url, options = {}, customToken) {
  // Dohvati token iz AuthContext-a ili prosleđen
  let token = customToken || localStorage.getItem("saas_token") || localStorage.getItem("token");
  try {
    if (!token) {
      // Probaj iz localStorage
      token = localStorage.getItem("token");
    }
  } catch { }
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
