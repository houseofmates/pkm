import { api } from './nocobase-client';
import { SimplyPluralClient } from '@/lib/simply-plural-client';
import { toast } from 'sonner';

export const MemberService = {
    /**
     * Uploads an avatar to NocoBase, syncs it to SimplyPlural, and updates the local override.
     * @param memberId SimplyPlural Member ID
     * @param file File object to upload
     * @param updateLocalCallback Callback to update local FronterContext state
     */
    async updateMemberAvatar(
        memberId: string,
        file: File,
        updateLocalCallback: (id: string, data: { avatarUrl: string }) => void
    ) {
        const toastId = toast.loading("Uploading avatar...");

        try {
            // 1. Upload to NocoBase
            console.log("MemberService: Uploading file to NocoBase...");
            const uploadRes = await api.upload(file);

            // Extract URL (NocoBase returns { data: { url: ... } })
            const fileData = uploadRes.data || uploadRes;
            let fileUrl = fileData.url;

            if (!fileUrl) {
                throw new Error("Upload succeeded but no URL returned from NocoBase");
            }

            console.log("MemberService: File uploaded, URL:", fileUrl);

            // Construct Full URL for SimplyPlural (needs public/absolute)
            // But keep relative for local use (so HeadmateCard can auth it)
            let absoluteUrl = fileUrl;
            if (fileUrl.startsWith('/')) {
                const baseUrl = window.location.origin;
                absoluteUrl = `${baseUrl}${fileUrl}`;
            }

            // 2. Patch SimplyPlural
            const apiKey = localStorage.getItem('pk_api_key');
            if (apiKey) {
                console.log("MemberService: Patching SimplyPlural...");

                // Try flattened structure first (common alternative if 'content' wrapper fails)
                // If previous error was "Error at content", then 'content' key is likely forbidden at root of PATCH.
                // We also set avatarUuid to "" to ensure the system prioritizes the new URL over any existing internal image.
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
                    console.warn(`MemberService: SimplyPlural Patch Failed (${spRes.status}):`, errText);
                    toast.warning(`Image saved locally, but SimplyPlural sync failed: ${spRes.status} - ${errText}`, { id: toastId });
                } else {
                    const resJson = await spRes.json().catch(() => ({}));
                    console.log("MemberService: SimplyPlural Patch Success", resJson);
                    toast.success("Avatar updated and synced!", { id: toastId });
                }
            } else {
                console.warn("MemberService: No API Key, skipping SimplyPlural sync");
                toast.success("Avatar saved locally (No API Key)", { id: toastId });
            }

            // 3. Update Local Override
            // Use relative URL so HeadmateCard uses its authenticated proxy strategy
            updateLocalCallback(memberId, { avatarUrl: fileUrl });

            return fileUrl;

        } catch (error: any) {
            console.error("MemberService Error:", error);
            toast.error(`Avatar update failed: ${error.message}`, { id: toastId });
            throw error;
        }
    }
};
