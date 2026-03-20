# wilson agent architecture implementation steps

## approved plan breakdown
1. [x] create TODO.md with steps ✓
2. [ ] enhance /api/ai/chat to parse & execute JSON actions from qwen responses
3. [ ] implement action executor for write_memory (append/write), pieces_recent
4. [ ] add recursive execution loop (actions can generate more actions)
5. [ ] (optional) add /api/ai/promote endpoint for memory promotion logic
6. [ ] test full loop: chat → json action → memory update → chat sees memory
7. [ ] attempt_completion with explanation + demo curl command

## current status
- system prompt: ready (AI_PERSONA_PROMPT)
- memory: ready (5 md files, r/w/append/clear)
- pieces mcp: ready (recent/query/status)
- injection: ready (chat injects all)
- missing: json action backend execution

