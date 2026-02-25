import re

file_path = 'backend/server.js'

with open(file_path, 'r') as f:
    lines = f.readlines()

# Verify content before replacing by line number
if "const debounceBroadcast" in lines[68]:
    new_func = """const debounceBroadcast = (event, payload, delay = 500) => {
    if (payload.type === "chat") {
        io.emit(event, payload);
        return;
    }
    const key = `${payload.type}:${payload.uuid || payload.source || payload.player || 'global'}`;

    if (pendingEmits[key]) clearTimeout(pendingEmits[key].timeout);
    pendingEmits[key] = {
        timeout: setTimeout(() => {
            io.emit(event, payload);
            delete pendingEmits[key];
        }, delay)
    };
};
"""
    # Replace lines 69-82 (0-indexed 68-82, slicing is up to exclusive end)
    # The original function occupied lines 69 to 82.
    # Check line 82 content just in case.
    if "};" in lines[81]:
        lines[68:82] = [new_func]
        print("Replaced debounceBroadcast by line number.")
    else:
        print("Line 82 does not match expected end of function. Skipping line replacement.")
else:
    print("Line 69 does not match start of function. Skipping line replacement.")

content = "".join(lines)

# Fix Hardcoded Webhook URL
webhook_pattern = r"const webhookUrl = 'http://192\.168\.4\.233:5678/webhook/leave-join';"
webhook_replacement = "const webhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/leave-join';"

if re.search(webhook_pattern, content):
    content = re.sub(webhook_pattern, webhook_replacement, content)
    print("Replaced webhook URL.")
else:
    print("Could not find webhook URL to replace.")

with open(file_path, 'w') as f:
    f.write(content)
