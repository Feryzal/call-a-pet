export const handler = async (event, context) => {
  // CORS-Header für Preflight-Anfragen
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Behandelt die OPTIONS-Preflight-Anfrage
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // Setzt CORS-Header für eine erfolgreiche POST-Anfrage
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  let text_input;
  try {
    const body = event.body;
    if (body) {
      const data = JSON.parse(body);
      text_input = data.text_input;
    }
  } catch (e) {
    return {
      statusCode: 400,
      body: 'Invalid JSON',
      headers: headers
    };
  }
  
  // Rufe API-Schlüssel und Agent-ID aus den Umgebungsvariablen ab
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID;

  if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
    return {
      statusCode: 500,
      body: 'API keys not configured.',
      headers: headers
    };
  }

  try {
    // Sende die Anfrage an den ElevenLabs Conversational Agent Endpunkt
    const response = await fetch(`https://api.elevenlabs.io/v1/agent/${ELEVENLABS_AGENT_ID}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text_input
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        body: `ElevenLabs Agent API error: ${errorText}`,
        headers: headers
      };
    }

    // Wandle die Antwort in ein ArrayBuffer um (binäre Daten)
    const audioData = await response.arrayBuffer();

    // Gib die Audio-Daten als Base64-kodierten String zurück
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'audio/mpeg'
      },
      body: Buffer.from(audioData).toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Proxy Error:', error);
    return {
      statusCode: 500,
      body: `Internal server error: ${error.message}`,
      headers: headers
    };
  }
};