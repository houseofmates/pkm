# backend

express port 4100.

* file uploads
* socket.io broadcasts
* webhook receiver
* chat history persistence (`packages/backend/data/chat-history.json`, last 50 entries)
* duplicate chat/join/leave suppression (recent 3 entries, 10s window)

bridges [[n8n]] + frontend. [[system-overview]]
