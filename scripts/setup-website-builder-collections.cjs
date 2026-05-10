#!/usr/bin/env node
// setup collections for houseofmates website builder
// creates collections for: dupe.houseofmates.space, houseofmates.space, home.houseofmates.space, blog.houseofmates.space

const axios = require("axios");

const NOCOBASE_URL =
  process.env.NOCOBASE_URL || "https://db.houseofmates.space/api";
const API_KEY =
  process.argv[2] || process.env.ADMIN_API_KEY || process.env.NOCOBASE_API_KEY;

if (!API_KEY) {
  console.error("error: api key required");
  console.error("usage: node setup-website-builder-collections.cjs <api_key>");
  console.error("or set ADMIN_API_KEY or NOCOBASE_API_KEY env var");
  process.exit(1);
}

const client = axios.create({
  baseURL: NOCOBASE_URL.replace(/\/$/, ""),
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  },
});

// website pages collection schema
const pagesFields = [
  { type: "string", name: "title", interface: "input", title: "title" },
  { type: "string", name: "slug", interface: "input", title: "slug" },
  { type: "string", name: "site", interface: "input", title: "site" },
  {
    type: "string",
    name: "theme_color",
    interface: "input",
    title: "theme color",
    defaultValue: "var(--primary)",
  },
  {
    type: "string",
    name: "background",
    interface: "input",
    title: "background",
  },
  {
    type: "integer",
    name: "height",
    interface: "integer",
    title: "height",
    defaultValue: 0,
  },
  { type: "json", name: "elements", interface: "json", title: "elements" },
  {
    type: "boolean",
    name: "is_home",
    interface: "checkbox",
    title: "is home",
    defaultValue: false,
  },
  {
    type: "boolean",
    name: "enable_sounds",
    interface: "checkbox",
    title: "enable sounds",
    defaultValue: false,
  },
  {
    type: "string",
    name: "custom_pop_sound",
    interface: "input",
    title: "custom pop sound",
  },
  {
    type: "string",
    name: "custom_exit_sound",
    interface: "input",
    title: "custom exit sound",
  },
];

// form submissions collection schema
const formsFields = [
  { type: "string", name: "site", interface: "input", title: "site" },
  { type: "string", name: "form_name", interface: "input", title: "form name" },
  { type: "json", name: "data", interface: "json", title: "data" },
  {
    type: "string",
    name: "minecraft_username",
    interface: "input",
    title: "minecraft username",
  },
  { type: "integer", name: "rating", interface: "integer", title: "rating" },
  { type: "text", name: "message", interface: "textarea", title: "message" },
  {
    type: "datetime",
    name: "submitted_at",
    interface: "datetime",
    title: "submitted at",
  },
];

// site configurations
const sites = [
  {
    name: "dupe.houseofmates.space",
    pagesCollection: "dupemates-pages",
    formsCollection: "dupe-forms",
    pagesTitle: "dupe mates pages",
    formsTitle: "dupe forms",
  },
  {
    name: "houseofmates.space",
    pagesCollection: "site-pages",
    formsCollection: "form-submissions",
    pagesTitle: "website pages",
    formsTitle: "form submissions",
  },
  {
    name: "home.houseofmates.space",
    pagesCollection: "site-pages",
    formsCollection: "form-submissions",
    pagesTitle: "website pages",
    formsTitle: "form submissions",
    shared: true, // shares collections with houseofmates.space
  },
  {
    name: "blog.houseofmates.space",
    pagesCollection: "site-pages",
    formsCollection: "form-submissions",
    pagesTitle: "website pages",
    formsTitle: "form submissions",
    shared: true, // shares collections with houseofmates.space
  },
];

async function collectionExists(name) {
  try {
    const res = await client.get("/collections:list");
    const collections = res.data?.data || [];
    return collections.some((c) => c.name === name);
  } catch (err) {
    console.error(`failed to list collections: ${err.message}`);
    return false;
  }
}

async function getCollectionFields(collectionName) {
  try {
    const res = await client.get(
      `/collections:get?filterByTk=${encodeURIComponent(collectionName)}`,
    );
    return res.data?.data?.fields || [];
  } catch (err) {
    // fallback to fields:list
    try {
      const res = await client.get("/fields:list", {
        params: { "filter[collectionName]": collectionName },
      });
      return res.data?.data || [];
    } catch (e) {
      return [];
    }
  }
}

async function createCollection(name, title, fields, hidden = true) {
  try {
    await client.post("/collections:create", {
      name,
      title,
      hidden,
      fields,
    });
    console.log(`  ✓ created collection: ${name}`);
    return true;
  } catch (err) {
    if (
      err.response?.status === 400 &&
      err.response?.data?.message?.includes("already exists")
    ) {
      console.log(`  - collection ${name} already exists`);
      return false;
    }
    console.error(
      `  ✗ failed to create ${name}:`,
      err.response?.data?.message || err.message,
    );
    return false;
  }
}

async function ensureFields(collectionName, fields) {
  const existingFields = await getCollectionFields(collectionName);
  const existingNames = existingFields.map((f) => f.name);

  for (const field of fields) {
    if (!existingNames.includes(field.name)) {
      try {
        await client.post(`/${collectionName}:createField`, field);
        console.log(`    ✓ added field: ${field.name}`);
      } catch (err) {
        if (err.response?.status !== 400) {
          console.error(
            `    ✗ failed to add field ${field.name}:`,
            err.response?.data?.message || err.message,
          );
        }
      }
    }
  }
}

async function fixBrokenInheritance(collectionName) {
  try {
    // get collection details
    const res = await client.get(
      `/collections:get?filterByTk=${encodeURIComponent(collectionName)}`,
    );
    const col = res.data?.data;

    if (col?.inherits && col.inherits.length > 0) {
      // check if parent exists
      const allRes = await client.get("/collections:list");
      const allCols = allRes.data?.data || [];
      const hasParent = col.inherits.some((inherited) =>
        allCols.some((c) => c.name === inherited),
      );

      if (!hasParent) {
        console.log(`    ! broken inheritance detected, fixing...`);
        await client.post("/collections:update", null, {
          params: { filterByTk: collectionName },
          data: { inherits: [] },
        });
        console.log(`    ✓ inheritance reset for ${collectionName}`);
      }
    }
  } catch (err) {
    // ignore inheritance check failures
  }
}

async function setupSite(site) {
  console.log(`\n[${site.name}]`);

  // skip if shared collections already handled
  if (site.shared) {
    console.log(
      `  - uses shared collections (${site.pagesCollection}, ${site.formsCollection})`,
    );
    return;
  }

  // check and create pages collection
  const pagesExists = await collectionExists(site.pagesCollection);
  if (!pagesExists) {
    await createCollection(site.pagesCollection, site.pagesTitle, pagesFields);
  } else {
    console.log(
      `  - collection ${site.pagesCollection} exists, checking fields...`,
    );
    await fixBrokenInheritance(site.pagesCollection);
    await ensureFields(site.pagesCollection, pagesFields);
  }

  // check and create forms collection
  const formsExists = await collectionExists(site.formsCollection);
  if (!formsExists) {
    await createCollection(site.formsCollection, site.formsTitle, formsFields);
  } else {
    console.log(
      `  - collection ${site.formsCollection} exists, checking fields...`,
    );
    await fixBrokenInheritance(site.formsCollection);
    await ensureFields(site.formsCollection, formsFields);
  }
}

async function createHomePage(siteIdentifier, pagesCollection) {
  // check if home page already exists
  try {
    const res = await client.get(`/${pagesCollection}:list`, {
      params: {
        filter: { site: siteIdentifier, is_home: true },
        pageSize: 1,
      },
    });

    if (res.data?.data?.length > 0 || res.data?.data?.data?.length > 0) {
      console.log(`  - home page already exists for ${siteIdentifier}`);
      return;
    }

    // create default home page
    await client.post(`/${pagesCollection}:create`, {
      title: "home",
      slug: "home",
      site: siteIdentifier,
      is_home: true,
      theme_color: "var(--primary)",
      background: "#050505",
      elements: "[]",
    });
    console.log(`  ✓ created home page for ${siteIdentifier}`);
  } catch (err) {
    console.error(
      `  ✗ failed to create home page:`,
      err.response?.data?.message || err.message,
    );
  }
}

async function main() {
  console.log("setting up website builder collections...\n");
  console.log(`api url: ${NOCOBASE_URL}`);

  // setup collections for each site
  for (const site of sites) {
    await setupSite(site);
  }

  // create default home pages
  console.log("\n[creating default home pages]");

  // dupe site
  await createHomePage("dupe", "dupemates-pages");

  // main site (houseofmates.space)
  await createHomePage("houseofmates", "site-pages");

  // home subdomain
  await createHomePage("home", "site-pages");

  // blog subdomain
  await createHomePage("blog", "site-pages");

  console.log("\n✓ setup complete");
}

main().catch((err) => {
  console.error("setup failed:", err.message);
  process.exit(1);
});
