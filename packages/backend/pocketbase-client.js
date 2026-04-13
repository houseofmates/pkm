import PocketBase from "pocketbase";

const POCKETBASE_URL =
  process.env.VITE_POCKETBASE_URL ||
  process.env.POCKETBASE_URL ||
  "http://192.168.4.233:8090";

export const pb = new PocketBase(POCKETBASE_URL);

export async function authenticatePocketBase() {
  const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
  const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    try {
      await pb.admins.authWithPassword(adminEmail, adminPassword);
      console.log("[PocketBase] admin authenticated successfully");
    } catch (err) {
      console.error("[PocketBase] admin auth failed:", err.message);
    }
  }
}

export async function createRecord(collection, data, authHeader) {
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    pb.authStore.save(token, null);
  }

  try {
    const record = await pb.collection(collection).create(data);
    return { success: true, data: record };
  } catch (err) {
    console.error(
      `[PocketBase] createRecord error (${collection}):`,
      err.message,
    );
    return { success: false, error: err.message };
  }
}

export async function updateRecord(collection, id, data, authHeader) {
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    pb.authStore.save(token, null);
  }

  try {
    const record = await pb.collection(collection).update(id, data);
    return { success: true, data: record };
  } catch (err) {
    console.error(
      `[PocketBase] updateRecord error (${collection}:${id}):`,
      err.message,
    );
    return { success: false, error: err.message };
  }
}

export async function deleteRecord(collection, id, authHeader) {
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    pb.authStore.save(token, null);
  }

  try {
    await pb.collection(collection).delete(id);
    return { success: true };
  } catch (err) {
    console.error(
      `[PocketBase] deleteRecord error (${collection}:${id}):`,
      err.message,
    );
    return { success: false, error: err.message };
  }
}

export async function listRecords(collection, params = {}, authHeader) {
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    pb.authStore.save(token, null);
  }

  try {
    const { page = 1, perPage = 50, sort, filter } = params;
    const result = await pb.collection(collection).getList(page, perPage, {
      sort,
      filter,
    });
    return { success: true, data: result.items, total: result.totalItems };
  } catch (err) {
    console.error(
      `[PocketBase] listRecords error (${collection}):`,
      err.message,
    );
    return { success: false, error: err.message, data: [] };
  }
}

export async function getRecord(collection, id, authHeader) {
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    pb.authStore.save(token, null);
  }

  try {
    const record = await pb.collection(collection).getOne(id);
    return { success: true, data: record };
  } catch (err) {
    console.error(
      `[PocketBase] getRecord error (${collection}:${id}):`,
      err.message,
    );
    return { success: false, error: err.message };
  }
}

export async function getFullList(collection, params = {}, authHeader) {
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    pb.authStore.save(token, null);
  }

  try {
    const { sort, filter } = params;
    const records = await pb.collection(collection).getFullList({
      sort,
      filter,
    });
    return { success: true, data: records };
  } catch (err) {
    console.error(
      `[PocketBase] getFullList error (${collection}):`,
      err.message,
    );
    return { success: false, error: err.message, data: [] };
  }
}

export default pb;
