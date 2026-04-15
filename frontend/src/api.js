const API_URL = "https://knjigovodstvo-backend.onrender.com";

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("jwt");
  const method = (options.method || 'GET').toUpperCase();
  let headers = { ...(options.headers || {}) };
  let fetchOptions = { ...options };

  // Za GET ne šalji Content-Type ni body
  if (method === 'GET') {
    delete fetchOptions.body;
  } else {
    // Ako je body FormData, NE postavljaj Content-Type (browser će sam)
    if (!(fetchOptions.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;
  fetchOptions.headers = headers;

  const response = await fetch(API_URL + path, fetchOptions);
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: 'Nevalidan JSON odgovor', raw: text };
  }
}


