// pieces mcp client - connects to pieces os mcp server to get recent activity context
// pieces os mcp url: http://192.168.4.250:39301/model_context_protocol/2025-03-26/mcp

import axios from 'axios';

const PIECES_MCP_URL = process.env.PIECES_MCP_URL || 'http://192.168.4.250:39301/model_context_protocol/2025-03-26/mcp';
const CONTEXT_HOURS = parseInt(process.env.PIECES_CONTEXT_HOURS || '2', 10);

// mcp json-rpc request helper
async function mcpRequest(method, params = {}) {
  try {
    const response = await axios.post(PIECES_MCP_URL, {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.data.error) {
      console.error('[Pieces MCP] error:', response.data.error);
      return null;
    }
    
    return response.data.result;
  } catch (err) {
    console.error('[Pieces MCP] request failed:', err.message);
    return null;
  }
}

// get recent activity from pieces os (last N hours)
export async function getPiecesRecentActivity(hours = CONTEXT_HOURS) {
  const result = await mcpRequest('get_recent_activity', { hours });
  
  if (!result) {
    // try alternative method - get all snippets/activities
    return await getPiecesSnippets();
  }
  
  return result;
}

// get snippets from pieces os
async function getPiecesSnippets() {
  const result = await mcpRequest('list_snippets', { limit: 50 });
  
  if (!result || !result.snippets) {
    return null;
  }
  
  // filter to recent (last 2 hours)
  const twoHoursAgo = Date.now() - (CONTEXT_HOURS * 60 * 60 * 1000);
  const recentSnippets = result.snippets.filter(s => {
    const timestamp = s.created_at || s.timestamp || 0;
    return timestamp > twoHoursAgo;
  });
  
  return {
    type: 'snippets',
    data: recentSnippets.map(s => ({
      content: s.content || s.text || '',
      type: s.type || 'text',
      timestamp: s.created_at || s.timestamp,
    }))
  };
}

// get relevant context based on query
export async function getPiecesContextForQuery(query) {
  const result = await mcpRequest('search', { query, limit: 10 });
  
  if (!result || !result.results) {
    return null;
  }
  
  return {
    type: 'search_results',
    query,
    results: result.results.map(r => ({
      content: r.content || r.text || '',
