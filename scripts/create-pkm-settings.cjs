#!/usr/bin/env node
// create pkm_settings collection for nocobase

const axios = require("axios");

const NOCOBASE_URL =
  process.env.NOCOBASE_URL || "https://db.houseofmates.space/api";
const API_KEY =
  process.argv[2] || process.env.ADMIN_API_KEY || process.env.NOCOBASE_API_KEY;

if (!API_KEY) {
  console.error("error: api key required");
  process.exit(1);
}

const client = axios.create({
  baseURL: NOCOBASE_URL.replace(/\/$/, ""),
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  },
});

async function createCollection() {
  try {
    // check if exists
    const listRes = await client.get("/collections:list");
    const exists = listRes.data?.data?.some((c) => c.name === "pkm_settings");

    if (exists) {
      console.log("pkm_settings collection already exists");
      return;
    }

    // create collection
    await client.post("/collections:create", {
      name: "pkm_settings",
      title: "pkm settings",
      hidden: true,
      fields: [
        { type: "string", name: "key", interface: "input", title: "key" },
        { type: "json", name: "value", interface: "json", title: "value" },
        {
          type: "string",
          name: "user_id",
          interface: "input",
          title: "user id",
        },
      ],
    });
    console.log("✓ created pkm_settings collection");
  } catch (err) {
    if (err.response?.data?.message?.includes("already exists")) {
      console.log("pkm_settings collection already exists");
    } else {
      console.error(
        "failed to create collection:",
        err.response?.data || err.message,
      );
    }
  }
}

createCollection();
