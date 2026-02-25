import re

file_path = 'backend/server.js'

with open(file_path, 'r') as f:
    content = f.read()

# Fix debounceBroadcast
pattern = r'const debounceBroadcast = \(event, payload, delay = 500\) => \{.*?\}\};'
replacement = r'''const debounceBroadcast = (event, payload, delay = 500) => {
    if (payload.type === "chat") {
        io.emit(event, payload);
        return;
    }
    // Key by type + identifier to debounce specific entities but allow concurrent updates
    const key = ;

    if (pendingEmits[key]) clearTimeout(pendingEmits[key].timeout);
    pendingEmits[key] = {
        timeout: setTimeout(() => {
            io.emit(event, payload);
            delete pendingEmits[key];
        }, delay)
    };
};'''

# Use DOTALL to match across lines
regex = re.compile(pattern, re.DOTALL)
if regex.search(content):
    content = regex.sub(replacement, content)
else:
    print("Could not find debounceBroadcast to replace.")

# Fix Hardcoded Webhook URL
webhook_pattern = r"const webhookUrl = 'http://192\.168\.4\.233:5678/webhook/leave-join';"
webhook_replacement = "const webhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/leave-join';"

content = re.sub(webhook_pattern, webhook_replacement, content)

with open(file_path, 'w') as f:
    f.write(content)

print("Updated backend/server.js")
