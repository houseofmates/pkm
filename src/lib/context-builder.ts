
import { NocoBaseClient } from '@/api/nocobase-client';


export async function buildKnowledgeContext(client: NocoBaseClient): Promise<string> {
    try {
        // 1. Fetch Schema (Collections)
        // We need to know what collections exist.
        const collectionsRes = await client.listCollections({
            params: {
                // Ensure we get fields if possible, though list usually gives metadata
                // We might need to handle 'appends' if defaults change, but standard list is okay.
                paginate: false
            }
        });

        const collections = collectionsRes.data;
        if (!collections || collections.length === 0) {
            return "No databases found.";
        }

        let context = "Here is the current state of the user's NocoBase data:\n\n";

        // 2. Fetch Sample Data for each main collection
        // We limit to first 5 collections and 5 records each to avoid context overflow for now.
        // Priority: Collections with 'user' created names likely matter more than system ones? 
        // For now, take first 5.
        const targetCollections = collections.slice(0, 5);

        for (const col of targetCollections) {
            context += `## Collection: ${col.title || col.displayName || col.name} (System Name: ${col.name})\n`;

            // Describe Fields
            if (col.fields && col.fields.length > 0) {
                const fieldDesc = col.fields
                    .filter((f: any) => !f.hidden && f.interface !== 'subTable') // Skip complex relations for brevity
                    .map((f: any) => `${f.title} (${f.type})`)
                    .join(', ');
                context += `Fields: ${fieldDesc}\n`;
            }

            // Fetch Records
            try {
                const recordsRes = await client.listRecords(col.name, {
                    pageSize: 5,
                    sort: ['-createdAt', '-id'] // Recent first
                });

                const records = Array.isArray(recordsRes.data) ? recordsRes.data : (recordsRes.data as any)?.data || [];

                if (records.length > 0) {
                    context += "Recent 5 Records:\n";
                    records.forEach((rec: any) => {
                        // Simplify record to JSON string but remove heavy metadata
                        const simpleRec = { ...rec };
                        delete simpleRec.created_at;
                        delete simpleRec.updated_at;
                        delete simpleRec.createdAt;
                        delete simpleRec.updatedAt;
                        delete simpleRec.created_by_id;
                        delete simpleRec.updated_by_id;

                        context += `- ${JSON.stringify(simpleRec)}\n`;
                    });
                } else {
                    context += "(No records found)\n";
                }
            } catch (err) {
                context += "(Error fetching records for this collection)\n";
            }
            context += "\n";
        }

        return context;

    } catch (error) {
        console.error("Failed to build knowledge context", error);
        return "Error loading database context.";
    }
}
