import axios from "axios";

const NOCOBASE_URL =
  process.env.NOCOBASE_URL ||
  process.env.VITE_NOCOBASE_URL ||
  "http://localhost:13000/api";

const NOCOBASE_API_KEY = process.env.NOCOBASE_API_KEY || "";

const api = axios.create({
  baseURL: NOCOBASE_URL,
  headers: {
    "Authorization": `Bearer ${NOCOBASE_API_KEY}`,
    "Content-Type": "application/json",
  },
});

export async function authenticateNocoBase() {
  if (NOCOBASE_API_KEY) {
    console.log("[NocoBase] API key configured");
  } else {
    console.warn("[NocoBase] No API key configured");
  }
}

export async function createRecord(collection, data, authHeader) {
  const headers = {};
  if (authHeader) {
    headers["Authorization"] = authHeader;
  } else if (NOCOBASE_API_KEY) {
    headers["Authorization"] = `Bearer ${NOCOBASE_API_KEY}`;
  }

  try {
    const response = await api.post(`${collection}:create`, data, { headers });
    return { success: true, data: response.data };
  } catch (err) {
    console.error(
      `[NocoBase] createRecord error (${collection}):`,
      err.message,
    );
    return { success: false, error: err.message };
  }
}

export async function updateRecord(collection, id, data, authHeader) {
  const headers = {};
  if (authHeader) {
    headers["Authorization"] = authHeader;
  } else if (NOCOBASE_API_KEY) {
    headers["Authorization"] = `Bearer ${NOCOBASE_API_KEY}`;
  }

  try {
    const response = await api.post(`${collection}:update?filterByTk=${id}`, data, { headers });
    return { success: true, data: response.data };
  } catch (err) {
    console.error(
      `[NocoBase] updateRecord error (${collection}:${id}):`,
      err.message,
    );
    return { success: false, error: err.message };
  }
}

export async function deleteRecord(collection, id, authHeader) {
  const headers = {};
  if (authHeader) {
    headers["Authorization"] = authHeader;
  } else if (NOCOBASE_API_KEY) {
    headers["Authorization"] = `Bearer ${NOCOBASE_API_KEY}`;
  }

  try {
    await api.post(`${collection}:destroy?filterByTk=${id}`, {}, { headers });
    return { success: true };
  } catch (err) {
    console.error(
      `[NocoBase] deleteRecord error (${collection}:${id}):`,
      err.message,
    );
    return { success: false, error: err.message };
  }
}

export async function listRecords(collection, params = {}, authHeader) {
  const headers = {};
  if (authHeader) {
    headers["Authorization"] = authHeader;
  } else if (NOCOBASE_API_KEY) {
    headers["Authorization"] = `Bearer ${NOCOBASE_API_KEY}`;
  }

  try {
    const { page = 1, pageSize = 50, sort, filter } = params;
    const queryParams = new URLSearchParams();
    queryParams.append("page", page);
    queryParams.append("pageSize", pageSize);
    if (sort) queryParams.append("sort", sort);
    if (filter) queryParams.append("filter", JSON.stringify(filter));

    const response = await api.get(`${collection}:list?${queryParams.toString()}`, { headers });
    return { success: true, data: response.data.data || [], total: response.data.meta?.count || 0 };
  } catch (err) {
    console.error(
      `[NocoBase] listRecords error (${collection}):`,
      err.message,
    );
    return { success: false, error: err.message, data: [] };
  }
}

export async function getRecord(collection, id, authHeader) {
  const headers = {};
  if (authHeader) {
    headers["Authorization"] = authHeader;
  } else if (NOCOBASE_API_KEY) {
    headers["Authorization"] = `Bearer ${NOCOBASE_API_KEY}`;
  }

  try {
    const response = await api.get(`${collection}:get?filterByTk=${id}`, { headers });
    return { success: true, data: response.data };
  } catch (err) {
    console.error(
      `[NocoBase] getRecord error (${collection}:${id}):`,
      err.message,
    );
    return { success: false, error: err.message };
  }
}

export async function getFullList(collection, params = {}, authHeader) {
  const result = await listRecords(collection, { ...params, pageSize: 1000 }, authHeader);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return result;
}

export default api;
