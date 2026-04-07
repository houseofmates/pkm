import os
import re

def lowercase_comments(content):
    # more careful regex to avoid matching // inside strings (approximate)
    # this will skip lines that look like they contain a url but it is safer

    lines = content.split('\n')
    new_lines = []

    for line in lines:
        # skip if line contains http:// or https:// and the // is part of it
        if 'http://' in line or 'https://' in line:
            # only lowercase if there is a // after the url part that is not part of another url
            # for simplicity, let's just skip these lines for // comments
            pass
        else:
            # match // that is not preceded by : (to avoid urls if we missed any)
            line = re.sub(r'(?<!:)\/\/\s*(.*)', lambda m: "// " + m.group(1).lower(), line)

        new_lines.append(line)

    content = '\n'.join(new_lines)

    # handle /* */ comments (including multi-line)
    # block comments usually don't contain urls that would be broken by lowercasing
    # but we should still be careful. however, the requirement is strict lowercase comments.
    def repl_block(match):
        return "/* " + match.group(1).lower() + " */"

    content = re.sub(r'/\*\s*(.*?)\s*\*/', repl_block, content, flags=re.DOTALL)

    return content

def process_dir(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.ts', '.tsx', '.css', '.js', '.jsx')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    try:
                        content = f.read()
                    except UnicodeDecodeError:
                        continue

                new_content = lowercase_comments(content)

                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"fixed: {path}")

process_dir('packages/core/src')
process_dir('apps/web/src')
