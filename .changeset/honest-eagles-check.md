---
"@aldea/compiler": minor
"@aldea/core": minor
"@aldea/sdk": minor
---

Change to design of ABI structure and Jig model. Including:

- static methods removed
- EXEC removed. EXECFUNC becomes EXEC
- access modifiers on fields now ignores (public by definition)
- access modifiers on methods refined
- plain objects are first class code items like classes and functions
- protected and private constructors are enabled
