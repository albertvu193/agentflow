---
detect:
  - "function "
  - "class "
  - "const "
  - "import "
  - "def "
  - "```"
  - "module.exports"
  - "=>"
label: code
---

Context: The user's input contains source code or references code.

Additional instructions for this context:
- Treat code blocks as primary artifacts — preserve formatting, indentation, and syntax
- When analyzing, focus on correctness, security, and performance
- When producing code, make it production-ready with proper error handling
- Reference specific line numbers or function names when discussing code
- Prefer concrete code examples over abstract descriptions
