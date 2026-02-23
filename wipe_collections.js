import axios from 'axios';

const collections = [
  "actions_21b9ed6c1f7c810cae94d42cd8e10df1_all",
  "AI_prompts_21b9ed6c1f7c81dbbc9bed035fd94f73_all",
  "AI_topics_21b9ed6c1f7c81f0a705d38a94c6e7e9_all",
  "answers_21b9ed6c1f7c81a885cfddb3373f70d3_all",
  "Aphrodite_information_2189ed6c1f7c81be90f3c76704f841aa_all",
  "Areas__DTC2_0__22f9ed6c1f7c814fab01c3d13145eace_all",
  "Brands_22f9ed6c1f7c814abb86f331d1c62a86_all",
  "Bucket_List__DTC2_0__22f9ed6c1f7c81baa28fd6873ecdd868_all",
  "Categories_22f9ed6c1f7c81499061e46867b7a7c5_all",
  "challenge_tracker_20b9ed6c1f7c81aba315ec7626907afe_all",
  "cognitive_distortions_20a9ed6c1f7c81bbbe6ee5896c0f98f4_all",
  "crystals_2209ed6c1f7c810a8b44ddc22f1ad67a_all",
  "Emergency_Docs_2079ed6c1f7c81f98ce5d6ecc1333fb3_all",
  "Energy_2469ed6c1f7c8151b5e2ddb33054172f_all",
  "Events__DTC2_0__22f9ed6c1f7c81beb594ee16b8ae3f06_all",
  "Favorite__DTC2_0__22f9ed6c1f7c8167968fd3a6a32fca9b_all",
  "Files___Media__DTC2_0__22f9ed6c1f7c812b9bc4ca11f3b63794_all",
  "front_log_20a9ed6c1f7c808eae76c652ab1a858b_all",
  "gamification_21b9ed6c1f7c813db931f7464597ff68_all",
  "gamification_targets_2189ed6c1f7c81389eb4c850038f0ba2_all",
  "gods___goddesses_2269ed6c1f7c80efbac4f095056956d6_all",
  "insights_21b9ed6c1f7c81fb9dc0d25b9ab2939d_all",
  "internal_relationships_2009ed6c1f7c81f9bed7d8c7229122b8_all",
  "know_yourself_categories_21b9ed6c1f7c812d92fbe38f3514d8e9_all",
  "languages_20b9ed6c1f7c810b95a0f70c3286eaea_all",
  "location_visit_log_1fb9ed6c1f7c80ccb2e4fbaa1ee3fcad_all",
  "Navigation__DTC_2_0__22f9ed6c1f7c8129bc7ac6b7504d7a3a_all",
  "Notes__DTC2_0__22f9ed6c1f7c81c0881aff57f94a853d_all",
  "Notion_Inputs_2309ed6c1f7c81c79ec8e324ccbf8f9a_all",
  "Overview_22d9ed6c1f7c818ea58bcbbd29d4a116_all",
  "relationships_2389ed6c1f7c8041acc4cb20d26ffac1_all",
  "resources_20b9ed6c1f7c816d8b87f4c60257b702_all",
  "scales_database_21b9ed6c1f7c81ffb624c23e7c5a1c59_all",
  "situations_2059ed6c1f7c8171b5b2d07bb481fe16_all",
  "Subscriptions_22d9ed6c1f7c81caa867f68ef686f31a_all",
  "tone_of_self-talk_2059ed6c1f7c81fcaee6e412b4d83a3f_all",
  "unhelpful_thoughts_20a9ed6c1f7c81929152d63e0de15653_all",
  "Wishlist_2309ed6c1f7c815d9029e06937861ec8_all"
];

const JWT = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc3MTEzNzAwNCwiZXhwIjozMzMyODczNzAwNH0.9O4PLiE05_J2UUTMOaf8RcA8LfibtDnuZSuMpGK9zZs";

async function run() {
  for (const collection of collections) {
    try {
      await axios.post(`https://db.houseofmates.space/api/collections:destroy?filterByTk=${collection}`, {}, {
        headers: { Authorization: JWT }
      });
      console.log(`Destroyed ${collection}`);
    } catch (e) {
      console.log(`Failed to destroy ${collection}:`, e.response?.data?.errors || e.message);
    }
  }
}

run();
