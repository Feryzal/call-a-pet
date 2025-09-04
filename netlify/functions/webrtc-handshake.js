// netlify/functions/webrtc-handshake.js
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors(), body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors(), body: 'Method not allowed' };

  const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
  const AGENT = process.env.ELEVENLABS_AGENT_ID;
  if (!ELEVEN_KEY || !AGENT) {
    return { statusCode: 500, headers: cors(), body: json({ step:'env', ok:false, error:'Missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID' }) };
  }

  let sdp = '';
  try { sdp = JSON.parse(event.body || '{}').sdp || ''; } catch {}
  if (!sdp) return { statusCode: 400, headers: cors(), body: json({ step:'input', ok:false, error:'Missing sdp' }) };

  try {
    // 1) Token holen
    const tokenUrl = new URL('https://api.elevenlabs.io/v1/convai/conversation/token');
    tokenUrl.searchParams.set('agent_id', AGENT);
    const tokRes = await fetch(tokenUrl, { headers: { 'xi-api-key': ELEVEN_KEY } });

    const tokText = await tokRes.text();
    if (!tokRes.ok) {
      return { statusCode: tokRes.status, headers: cors(), body: json({ step:'token', ok:false, status:tokRes.status, body:tokText }) };
    }

    let token;
    try { token = JSON.parse(tokText).token; } catch {}
    if (!token) {
      return { statusCode: 502, headers: cors(), body: json({ step:'token-parse', ok:false, raw: tokText }) };
    }

    // 2) WebRTC-Handshake
    const wrtcRes = await fetch('https://api.elevenlabs.io/v1/convai/conversation/webrtc', {
      method: 'POST',
      headers: {
        // Groß-/Kleinschreibung ist egal, aber wir setzen es "klassisch":
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/sdp',
        'Accept': 'application/sdp'
      },
      body: sdp
    });

    const answer = await wrtcRes.text();
    if (!wrtcRes.ok) {
      return {
        statusCode: wrtcRes.status,
        headers: cors(),
        body: json({ step:'webrtc', ok:false, status:wrtcRes.status, body:answer })
      };
    }

    // Erfolg
    return { statusCode: 200, headers: { ...cors(), 'content-type': 'application/sdp' }, body: answer };
  } catch (e) {
    return { statusCode: 500, headers: cors(), body: json({ step:'exception', ok:false, error: e.message }) };
  }
};

const cors = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
});
const json = (obj) => JSON.stringify(obj);
