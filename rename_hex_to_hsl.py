import os

files = ['src/hooks/use-theme-reactor.ts', 'src/pages/root-layout.tsx']

for file_path in files:
    try:
        with open(file_path, 'r') as f:
            content = f.read()

        # Simple replace for now, as it's a specific function name
        content = content.replace('HexToHsl', 'hexToHsl')

        with open(file_path, 'w') as f:
            f.write(content)
        print(f"Updated {file_path}")
    except FileNotFoundError:
        print(f"File not found: {file_path}")
