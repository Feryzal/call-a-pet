export const handler = async (event, context) => {
  // Behandelt die OPTIONS-Preflight-Anfrage
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

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
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    };
  }

  // Rufe API-Schlüssel und Agent-ID aus den Umgebungsvariablen ab
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID;

  if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
    return {
      statusCode: 500,
      body: 'API keys not configured.',
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
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
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      };
    }

    // Wandle die Antwort in ein ArrayBuffer um (binäre Daten)
    const audioData = await response.arrayBuffer();

    // Gib die Audio-Daten als Base64-kodierten String zurück
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
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
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    };
  }
};
