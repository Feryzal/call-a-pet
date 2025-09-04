export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors(), body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors(), body: 'Method not allowed' };

  const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
  const AGENT = process.env.ELEVENLABS_AGENT_ID;
  if (!ELEVEN_KEY || !AGENT) return { statusCode: 500, headers: cors(), body: 'Missing env vars' };

  let sdp = '';
  try { sdp = JSON.parse(event.body||'{}').sdp || ''; } catch {}
  if (!sdp) return { statusCode: 400, headers: cors(), body: 'Missing sdp' };

  // 1) Token holen
  const u = new URL('https://api.elevenlabs.io/v1/convai/conversation/token');
  u.searchParams.set('agent_id', AGENT);
  const tokRes = await fetch(u, { headers:{'xi-api-key':ELEVEN_KEY} });
  if(!tokRes.ok) return { statusCode: tokRes.status, headers: cors(), body: await tokRes.text() };
  const { token } = await tokRes.json();

  // 2) WebRTC-Handshake serverseitig durchführen
  const r = await fetch('https://api.elevenlabs.io/v1/convai/conversation/webrtc', {
    method:'POST', headers:{ 'authorization':`Bearer ${token}`, 'content-type':'application/sdp' }, body: sdp
  });
  const answer = await r.text();
  if(!r.ok) return { statusCode: r.status, headers: cors(), body: answer };

  return { statusCode: 200, headers: { ...cors(), 'content-type':'application/sdp' }, body: answer };
};

const cors = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
});
