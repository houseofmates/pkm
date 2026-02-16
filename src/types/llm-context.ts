export interface IdentityContext {
  activeFronter: {
  id: string;
  name: string;
  pronouns?: string;
  description?: string;
  avatarUrl?: string; // Local or proxied URL
  } | null;
  systemName?: string;
  // We can add a summary of recent fronters here later if needed
}

export interface AffectiveContext {
  currentMood: {
  name: string;
  intensity?: number; // 0-10 or similar
  note?: string;
  } | null;
  // Derived from moodboard or specific mood logs
  globalState?: string; // e.g. "stressed", "relaxed"
}

export interface ActivityContext {
  recentActions: Array<{
  type: string; // 'create_record', 'edit', 'front_change'
  summary: string;
  timestamp: string;
  }>;
  activeProject?: string; // Inferred from dashboard usage
}

export interface LLMContextPayload {
  identity: IdentityContext;
  affective: AffectiveContext;
  activity: ActivityContext;
  timestamp: string;
  generatedAt: string;
}
