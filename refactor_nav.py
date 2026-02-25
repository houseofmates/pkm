import re

file_path = 'src/components/navigation.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# Remove import
content = content.replace("import { GlobalSearchDialog } from '@/components/global-search-dialog';", "")

# Remove component usage
# Using flexible regex for props order/whitespace
pattern = r'<GlobalSearchDialog\s+open=\{searchOpen\}\s+onOpenChange=\{setSearchOpen\}\s+/>'
if re.search(pattern, content):
    content = re.sub(pattern, "", content)
else:
    # Try alternate formatting
    pattern = r'<GlobalSearchDialog[^>]*/>'
    # Be careful not to match other things if GlobalSearchDialog is unique enough
    # But let's stick to specific if possible.
    # The previous cat output showed: <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    # So the regex should work.
    pass

# Change onClick handler
onclick_pattern = r'onClick=\{\(\) => setSearchOpen\(true\)\}'
onclick_replacement = "onClick={() => window.dispatchEvent(new CustomEvent('pkm:open-search'))}"
content = re.sub(onclick_pattern, onclick_replacement, content)

# Remove state declaration
state_pattern = r'const \[searchOpen, setSearchOpen\] = useState\(false\);'
content = re.sub(state_pattern, "", content)

with open(file_path, 'w') as f:
    f.write(content)

print("Refactored navigation.tsx")
