# n8n

n8n is the workflow automation engine that powers pkm's [[automation]] layer. it connects your knowledge system to external services and handles background tasks.

## what n8n does in pkm

- processes incoming [[capture-workflow|captures]]
- syncs data between [[nocobase-collections|nocobase]] and other tools
- runs scheduled maintenance (backups, cleanup)
- powers [[ai-features]] pipelines like [[wilson-rag]]

n8n runs as a docker container alongside the rest of the [[self-hosted]] stack. see also: [[n8n-workflow]], [[system-overview]]
