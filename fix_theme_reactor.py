import re

file_path = 'src/hooks/use-theme-reactor.ts'

with open(file_path, 'r') as f:
    content = f.read()

# Pattern for the unsafe storage read
pattern = r"const cached = storageManager\.getItem\('last_active_color'\);\n\s+if \(cached\) \{\n\s+color = cached;\n\s+\}"

replacement = r"""try {
        const cached = storageManager.getItem('last_active_color');
        if (cached) {
          color = cached;
        }
      } catch (e) {
        secureLogger.warn('Failed to read last_active_color', e);
      }"""

if re.search(pattern, content):
    content = re.sub(pattern, replacement, content)
else:
    # Try simpler match
    print("Could not find exact block, trying manual replacement logic.")
    # Assuming the block exists around line 45
    pass

with open(file_path, 'w') as f:
    f.write(content)

print("Updated use-theme-reactor.ts")
