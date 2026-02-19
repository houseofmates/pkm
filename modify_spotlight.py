import sys

path = 'src/components/Spotlight.tsx'
with open(path, 'r') as f:
    content = f.read()

old_block = '            let context = `user query: "\n\nsearch results from database:\n`;\n            if (externalContext) {\n                context += `\ncurrent page context: \n`;\n            }'

new_block = '            let context = `user query: "\n\nsearch results from database:\n`;\n            const activeContext = localContext || externalContext;\n            if (activeContext) {\n                context += `\ncurrent page context: \n`;\n            }'

if old_block in content:
    content = content.replace(old_block, new_block)
    with open(path, 'w') as f:
        f.write(content)
    print("Successfully updated Spotlight.tsx")
else:
    # Try simpler matching or line-based if exact string match fails due to formatting
    lines = content.splitlines()
    new_lines = []
    skip = 0
    updated = False
    for i, line in enumerate(lines):
        if skip > 0:
            skip -= 1
            continue

        if 'let context = `user query: "' in line and 'search results from database:\n`;' in line:
             new_lines.append(line)
             new_lines.append('            const activeContext = localContext || externalContext;')
             new_lines.append('            if (activeContext) {')
             new_lines.append('                context += `\ncurrent page context: \n`;')
             new_lines.append('            }')
             updated = True
             # Skip next lines if they were the old logic
             if i+1 < len(lines) and 'if (externalContext) {' in lines[i+1]:
                 skip = 1
                 if i+2 < len(lines) and 'context += `\ncurrent page context:' in lines[i+2]:
                     skip = 2
                     if i+3 < len(lines) and '}' in lines[i+3]:
                         skip = 3
        else:
            new_lines.append(line)

    if updated:
        with open(path, 'w') as f:
            f.write('\n'.join(new_lines))
        print("Successfully updated Spotlight.tsx (fallback method)")
    else:
        print("Could not find block to replace")
        print(content[3500:4000]) # Print context for debugging
