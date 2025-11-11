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

// Map locale codes to Polly voice IDs
const localeToVoice = {
  'en_US': 'Joanna',      // English (US) - Female
  'en_GB': 'Amy',         // English (UK) - Female
  'es_ES': 'Conchita',    // Spanish (Spain) - Female
  'es_MX': 'Mia',         // Spanish (Mexico) - Female
  'fr_FR': 'Celine',      // French (France) - Female
  'de_DE': 'Marlene',     // German - Female
  'it_IT': 'Carla',       // Italian - Female
  'pt_BR': 'Camila',      // Portuguese (Brazil) - Female
  'hi_IN': 'Aditi',       // Hindi (India) - Female
  'ja_JP': 'Mizuki',      // Japanese - Female
  'ko_KR': 'Seoyeon',     // Korean - Female
  'zh_CN': 'Zhiyu',       // Chinese (Mandarin) - Female
  'ar_AE': 'Zeina',       // Arabic (Gulf) - Female
  'ru_RU': 'Tatyana',     // Russian - Female
};

// Get voice ID from locale or language code
function getVoiceId(locale, language) {
  if (locale && localeToVoice[locale]) {
    return localeToVoice[locale];
  }
  if (language) {
    // Try to match by language prefix
    const langPrefix = language.toLowerCase().substring(0, 2);
    const matchingLocale = Object.keys(localeToVoice).find(loc => 
      loc.toLowerCase().startsWith(langPrefix)
    );
    if (matchingLocale) {
      return localeToVoice[matchingLocale];
    }
  }
  // Default to English
  return 'Joanna';
}

exports.speak = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const text = body.text || 'Welcome to ExoMart!';
    const locale = body.locale || body.language || 'en_US';
    const voiceId = getVoiceId(locale, body.language);

    const params = {
      OutputFormat: 'mp3',
      Text: text,
      VoiceId: voiceId,
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
