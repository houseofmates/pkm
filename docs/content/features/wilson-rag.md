# wilson rag

wilson is pkm's retrieval-augmented generation system. it combines your personal knowledge base with an llm to give answers grounded in your own [[notes]].

## how it works

1. your question goes to the [[semantic-search]] index
2. relevant [[notes]] and [[blocks]] are retrieved
3. the llm generates an answer using those sources
4. sources are cited so you can verify

wilson powers [[oracle-search]] and the [[ai-co-pilot]]. named after a trusted companion. see also: [[ai-features]]
