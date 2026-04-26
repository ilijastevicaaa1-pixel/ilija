const API_URL = import.meta.env.VITE_API_URL || "https://knjigovodstvo-backend.onrender.com";

export const apiFetch = async (path, options = {}) => {
  const token = localStorage.getItem("token");

  let headers = {
    ...(options.headers || {})
  };

  // Ako postoji body i NIJE FormData → JSON
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(API_URL + path, {
    ...options,
    headers
  });

  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: "Invalid JSON", raw: text };
  }
};