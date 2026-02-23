// utilities for working with NocoBase API responses

/**
 * Normalize the raw response from a NocoBase list endpoint into a
 * consistent shape that always has a `data` array and optional `meta`.
 *
 * NocoBase has changed response formats over time and different endpoints
 * or server versions may return:
 *
 *   - `[{...}, {...}]`
 *   - `{ data: [...] }`
 *   - `{ data: { data: [...], meta: {...} } }`
 *   - `{ data: { list: [...], total: 3 } }`
 *   - `{ list: [...], count: 5 }`
 *
 * This helper inspects several common locations and flattens them.
 */
export function normalizeListResponse(raw: any) {
  let data: any[] = [];
  let meta: any = undefined;

  if (raw == null) {
    return { data, meta };
  }

  if (Array.isArray(raw)) {
    data = raw;
    return { data, meta };
  }

  const tryExtract = (obj: any): boolean => {
    if (!obj || typeof obj !== 'object') return false;
    if (Array.isArray(obj.data)) {
      data = obj.data;
      meta = obj.meta ?? (obj.total != null ? { total: obj.total } : undefined) ?? (obj.count != null ? { total: obj.count } : undefined);
      return true;
    }
    if (Array.isArray(obj.list)) {
      data = obj.list;
      meta = obj.meta ?? (obj.total != null ? { total: obj.total } : undefined) ?? (obj.count != null ? { total: obj.count } : undefined);
      return true;
    }
    return false;
  };

  if (tryExtract(raw)) return { data, meta };
  if (tryExtract(raw.data)) return { data, meta };
  if (raw.data && tryExtract(raw.data.data)) return { data, meta };

  return { data, meta };
}

/**
 * Convenience wrapper used by hooks/components to pull the "records"
 * portion out of whatever NocoBase gave us.  This mirrors the logic used
 * internally by normalizeListResponse but returns just an array so callers
 * don't need to worry about metadata.
 */
export function extractRecords(responseData: any): any[] {
  if (!responseData) return [];
  if (Array.isArray(responseData)) return responseData;

  if (typeof responseData === 'object') {
    if (Array.isArray(responseData.data)) return responseData.data;
    if (Array.isArray(responseData.records)) return responseData.records;
    if (Array.isArray(responseData.items)) return responseData.items;
    if (Array.isArray(responseData.results)) return responseData.results;
    if (Array.isArray(responseData.list)) return responseData.list;
  }

  return [];
}
