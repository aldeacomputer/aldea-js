---
"@aldea/core": patch
---

Wrap structuredClone so it falls back to json stringify/parse in node < 18.
