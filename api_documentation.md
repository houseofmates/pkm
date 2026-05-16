# PKM API Documentation

Base URL: `http://localhost:4100/api`

## Authentication

Most endpoints require authentication via the `Authorization` header:

```
Authorization: Bearer <ADMIN_SECRET>
```

## Rate Limits

- General API: 100 requests per minute
- AI endpoints: 20 requests per minute
- Auth endpoints: 5 requests per 15 minutes
- File uploads: 10 requests per hour

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

## Response Format

All responses follow this format:

```json
{
    "success": true,
    "data": { ... }
}
```

Error responses:

```json
{
    "success": false,
    "error": {
        "message": "Error description",
        "code": "ERROR_CODE"
    }
}
```

## Endpoints

### AI Endpoints

#### POST /ai/chat

Send a chat message to the AI.

**Request Body:**
```json
{
    "message": "What are my habits?",
    "context": { "user_id": "uuid" },
    "model": "llama3.2"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "response": "Based on your data...",
        "model": "llama3.2"
    }
}
```

#### POST /ai/describe

Describe an image using AI.

**Request Body:**
```json
{
    "image_url": "https://example.com/image.jpg",
    "prompt": "Describe this image"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "description": "A beautiful landscape..."
    }
}
```

#### GET /ai/models

List available AI models.

**Response:**
```json
{
    "success": true,
    "data": {
        "models": [
            { "id": "llama3.2", "name": "Llama 3.2" }
        ]
    }
}
```

### Activity Endpoints

#### POST /activities/log

Log a user activity.

**Request Body:**
```json
{
    "user_id": "uuid",
    "activity_type": "meditation",
    "description": "Morning meditation",
    "metadata": { "duration": 600 },
    "timestamp": "2026-04-04T12:00:00Z"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": "activity-id",
        "user_id": "uuid",
        "activity_type": "meditation",
        "timestamp": "2026-04-04T12:00:00Z"
    }
}
```

#### GET /activities/history

Get user activity history.

**Query Parameters:**
- `user_id` (required): User UUID
- `start_date`: Filter from date
- `end_date`: Filter to date
- `limit`: Max results (default: 50, max: 100)
- `activity_type`: Filter by type

**Response:**
```json
{
    "success": true,
    "data": {
        "activities": [...],
        "total": 100,
        "page": 1,
        "limit": 50
    }
}
```

#### GET /activities/streaks

Get user activity streaks.

**Query Parameters:**
- `user_id` (required): User UUID

**Response:**
```json
{
    "success": true,
    "data": {
        "streaks": [
            {
                "activity_type": "meditation",
                "current_streak": 7,
                "longest_streak": 30
            }
        ]
    }
}
```

### Gamification Endpoints

#### POST /gamification/award-xp

Award XP to a user.

**Request Body:**
```json
{
    "user_id": "uuid",
    "amount": 100,
    "reason": "Completed daily meditation",
    "metadata": { "activity_id": "uuid" }
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "user_id": "uuid",
        "xp_awarded": 100,
        "total_xp": 1500,
        "level": 5
    }
}
```

#### GET /gamification/stats/:user_id

Get user gamification stats.

**Response:**
```json
{
    "success": true,
    "data": {
        "user_id": "uuid",
        "xp": 1500,
        "level": 5,
        "achievements": [...],
        "streaks": [...]
    }
}
```

#### POST /gamification/unlock-achievement

Unlock an achievement for a user.

**Request Body:**
```json
{
    "user_id": "uuid",
    "achievement_id": "uuid",
    "metadata": { "context": "..." }
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "user_id": "uuid",
        "achievement_id": "uuid",
        "unlocked_at": "2026-04-04T12:00:00Z"
    }
}
```

### Import Endpoints

#### POST /notion-import

Import a Notion workspace export.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: `file` (ZIP file)

**Response:**
```json
{
    "success": true,
    "data": {
        "task_id": "task-uuid",
        "status": "processing"
    }
}
```

#### GET /notion-import/:taskId/stream

Get Server-Sent Events stream for import progress.

**Response:**
```
data: {"progress": 0, "status": "processing"}
data: {"progress": 50, "status": "importing_pages"}
data: {"progress": 100, "status": "complete"}
```

#### POST /csv-import

Import CSV files.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: `files` (array of CSV files)

**Response:**
```json
{
    "success": true,
    "data": {
        "task_id": "task-uuid",
        "status": "processing"
    }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Request validation failed |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Internal server error |

## WebSocket API

Connect to WebSocket: `ws://localhost:4100`

### Events

**Client to Server:**
- `chat`: Send chat message
- `activity`: Log activity
- `sync`: Request data sync

**Server to Client:**
- `chat_response`: AI response
- `activity_logged`: Activity confirmation
- `sync_complete`: Sync finished

### Example

```javascript
const ws = new WebSocket('ws://localhost:4100');

ws.onopen = () => {
    ws.send(JSON.stringify({
        type: 'chat',
        message: 'Hello!'
    }));
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Received:', data);
};
```

## Health Check

#### GET /health

Check API health status.

**Response:**
```json
{
    "status": "ok",
    "timestamp": "2026-04-04T12:00:00Z",
    "uptime": 3600
}
```
