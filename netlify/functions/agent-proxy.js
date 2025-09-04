// Gibt ein WebRTC-Conversation-Token für deinen ElevenLabs-Agenten zurück.
// Nutzt Env-Vars: ELEVENLABS_API_KEY (Pflicht) und ELEVENLABS_AGENT_ID (Default-Agent).
// Frontend holt nur das Token; Audio läuft dann direkt via WebRTC Browser <-> ElevenLabs.

export const handler = async (event) => {
  // CORS / Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method not allowed' };
  }

  const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
  const DEFAULT_AGENT = process.env.ELEVENLABS_AGENT_ID;

  if (!ELEVEN_KEY) {
    return { statusCode: 500, headers: corsHeaders(), body: 'Missing ELEVENLABS_API_KEY' };
  }

  let agent_id = DEFAULT_AGENT;
  let participant_name = 'Webflow User';

  try {
    if (event.body) {
      const body = JSON.parse(event.body);
      if (body.agent_id) agent_id = body.agent_id; // erlaubt Override
      if (body.participant_name) participant_name = body.participant_name;
    }
  } catch {
    return { statusCode: 400, headers: corsHeaders(), body: 'Invalid JSON' };
  }

  if (!agent_id) {
    return { statusCode: 400, headers: corsHeaders(), body: 'Missing agent_id (set ELEVENLABS_AGENT_ID or send in body)' };
  }

  try {
    const url = new URL('https://api.elevenlabs.io/v1/convai/conversation/token');
    url.searchParams.set('agent_id', agent_id);
    url.searchParams.set('participant_name', participant_name);

    const r = await fetch(url, { headers: { 'xi-api-key': ELEVEN_KEY } });
    const text = await r.text();

    if (!r.ok) {
      return { statusCode: r.status, headers: corsHeaders(), body: text };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      body: text // -> { "token": "..." }
    };
  } catch (e) {
    return { statusCode: 500, headers: corsHeaders(), body: `Internal error: ${e.message}` };
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}
