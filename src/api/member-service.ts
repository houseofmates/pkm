import { api } from './nocobase-client';
import { SimplyPluralClient } from '@/lib/simply-plural-client';
import { toast } from 'sonner';
import { secureLogger } from '@/lib/secure-logger';

export const MemberService = {
  /**
 * uploads an avatar to nocobase, syncs it to simplyplural, and updates the local override.
 * @param memberid simplyplural member id
 * @param file file object to upload
 * @param updatelocalcallback callback to update local frontercontext state
 */
  async updateMemberAvatar(
  memberId: string,
  file: File,
  updateLocalCallback: (id: string, data: { avatarUrl: string }) => void
  ) {
  const toastId = toast.loading("Uploading avatar...");

  try {
  // 1. upload to nocobase
  secureLogger.info("MemberService: Uploading file to NocoBase...");
  const uploadRes = await api.upload(file);

  // extract url (nocobase returns { data: { url: ... } })
  const fileData = uploadRes.data || uploadRes;
  const fileUrl = fileData.url;

  if (!fileUrl) {
 throw new Error("Upload succeeded but no URL returned from NocoBase");
  }

  secureLogger.info("MemberService: File uploaded, URL:", fileUrl);

  // construct full url for simplyplural (needs public/absolute)
  // but keep relative for local use (so headmatecard can auth it)
  let absoluteUrl = fileUrl;
  if (fileUrl.startsWith('/')) {
 const baseUrl = window.location.origin;
 absoluteUrl = `${baseUrl}${fileUrl}`;
  }

  // 2. patch simplyplural
  const apiKey = localStorage.getItem('pk_api_key');
  if (apiKey) {
 secureLogger.info("MemberService: Patching SimplyPlural...");

 // try flattened structure first (common alternative if 'content' wrapper fails)
 // if previous error was "error at content", then 'content' key is likely forbidden at root of patch.
 // we also set avataruuid to "" to ensure the system prioritizes the new url over any existing internal image.
 const payload = {
 avatarUrl: absoluteUrl,
 avatarUuid: ""
 };

 const spRes = await fetch(SimplyPluralClient.url(`/member/${memberId}`), {
 method: 'PATCH',
 headers: {
 'Authorization': apiKey,
 'Content-Type': 'application/json'
 },
 body: JSON.stringify(payload)
 });

 if (!spRes.ok) {
 const errText = await spRes.text();
 secureLogger.warn(`MemberService: SimplyPlural Patch Failed (${spRes.status}):`, errText);
 toast.warning(`Image saved locally, but SimplyPlural sync failed: ${spRes.status} - ${errText}`, { id: toastId });
 } else {
 const resJson = await spRes.json().catch(() => ({}));
 secureLogger.info("MemberService: SimplyPlural Patch Success", resJson);
 toast.success("avatar updated and synced", { id: toastId });
 }
  } else {
 secureLogger.warn("MemberService: No API Key, skipping SimplyPlural sync");
 toast.success("avatar saved locally (no api key)", { id: toastId });
  }

  // 3. update local override
  // use relative url so headmatecard uses its authenticated proxy strategy
  updateLocalCallback(memberId, { avatarUrl: fileUrl });

  return fileUrl;

  } catch (error: unknown) {
  secureLogger.error("MemberService Error:", error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  toast.error(`Avatar update failed: ${errorMessage}`, { id: toastId });
  throw error;
  }
  }
};
