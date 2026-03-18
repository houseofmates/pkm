# llm editing rules

**add new page**:

```
content/new-folder/new-page.md

---
title: new page
---

# new page

content with [[links]]
```

**rules**:

* all ui text lowercase
* use [[title case]] → kebab-case files
* 800-1500 words per page
* 3-5 links per section
* consistent h2-h4 hierarchy

run `npm run wiki:lint` before commit.

