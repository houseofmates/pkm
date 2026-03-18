# relations

relations define how [[databases]] connect to each other. in [[nocobase-collections]], a relation field lets one record point to records in another collection.

## relation types

- **one-to-many** — one parent, many children (e.g. a project has many tasks)
- **many-to-many** — items linked freely in both directions
- **one-to-one** — a single paired record

relations are what make pkm a [[knowledge-graphs|knowledge graph]] rather than a flat file system. see also: [[connections]], [[fields]]
