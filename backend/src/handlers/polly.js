const AWS = require('aws-sdk');
const polly = new AWS.Polly();

function buildResponse(statusCode, body, isBase64 = false, contentType = 'application/json') {
  return {
    statusCode,
    headers: {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    isBase64Encoded: isBase64,
    body: isBase64 ? body.toString('base64') : JSON.stringify(body),
  };
}

exports.speak = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const text = body.text || 'Welcome to ExoMart!';

    const params = {
      OutputFormat: 'mp3',
      Text: text,
      VoiceId: 'Joanna',
      TextType: 'text',
    };

    // Call Polly synthesizeSpeech
    const data = await polly.synthesizeSpeech(params).promise();

    if (data.AudioStream instanceof Buffer) {
      // Return audio data base64 encoded
      return buildResponse(200, data.AudioStream, true, 'audio/mpeg');
    } else {
      return buildResponse(500, { error: 'AudioStream is not a buffer' });
    }
  } catch (err) {
    console.error('Polly error:', err);
    return buildResponse(500, { error: 'Internal Server Error' });
  }
};
