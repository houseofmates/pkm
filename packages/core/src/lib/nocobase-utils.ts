/* eslint-disable */
// utilities for normalizing api responses (originally for nocobase, now generic)

/**
 * normalize the raw response from a list endpoint into a
 * consistent shape that always has a `data` array and optional `meta`.
 *
 * different apis may return:
 *
 *   - `[{...}, {...}]`
 *   - `{ data: [...] }`
 *   - `{ data: { data: [...], meta: {...} } }`
 *   - `{ data: { list: [...], total: 3 } }`
 *   - `{ list: [...], count: 5 }`
 *
 * this helper inspects several common locations and flattens them.
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
 * convenience wrapper used by hooks/components to pull the "records"
 * portion out of api responses. this mirrors the logic used
 * internally by normalizelistresponse but returns just an array so callers
 * don't need to worry about metadata.
 */
export function extractRecords(responseData: any): any[] {
  if (!responseData) return [];
  if (Array.isArray(responseData)) return responseData;

  const tryExtract = (obj: any): any[] | null => {
    if (!obj || typeof obj !== 'object') return null;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.records)) return obj.records;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.results)) return obj.results;
    if (Array.isArray(obj.list)) return obj.list;
    return null;
  };

  // try direct properties
  let data = tryExtract(responseData);
  if (data) return data;

  // try nested data property (common in many apis)
  if (responseData.data) {
    data = tryExtract(responseData.data);
    if (data) return data;
  }

  return [];
}
