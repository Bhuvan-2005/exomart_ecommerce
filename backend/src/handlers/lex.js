const AWS = require('aws-sdk');

// AWS SDK automatically detects the region from Lambda execution environment
// Lambda provides AWS_REGION automatically, or we default to us-east-1
// Note: AWS_REGION is automatically set by Lambda, we don't need to set it in serverless.yml
const region = process.env.AWS_REGION || AWS.config.region || 'us-east-1';

const lexRuntime = new AWS.LexRuntimeV2({
  region: region,
});

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
  body: JSON.stringify(body),
});

module.exports.chat = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { message, sessionId, userId, locale } = body;

    if (!message || !message.trim()) {
      return response(400, {
        success: false,
        message: 'Message is required',
      });
    }

    // Get Lex bot configuration from environment variables
    const botId = process.env.LEX_BOT_ID;
    const botAliasId = process.env.LEX_BOT_ALIAS_ID;
    // Use provided locale or fallback to default (supports both en_US and hi_IN)
    const localeId = locale || process.env.LEX_LOCALE_ID || 'en_US';

    if (!botId || !botAliasId) {
      console.error('Lex configuration missing. Please set LEX_BOT_ID and LEX_BOT_ALIAS_ID');
      return response(500, {
        success: false,
        message: 'Chat service is not configured. Please contact support.',
      });
    }

    // Use provided sessionId or generate one from userId
    const sessionIdentifier = sessionId || `exomart-${userId || 'guest'}-${Date.now()}`;

    const params = {
      botId,
      botAliasId,
      localeId,
      sessionId: sessionIdentifier,
      text: message.trim(),
    };

    console.log('Sending to Lex:', { botId, botAliasId, sessionId: sessionIdentifier, messageLength: message.length });

    // Call Amazon Lex
    const lexResponse = await lexRuntime.recognizeText(params).promise();

    console.log('Lex response:', JSON.stringify(lexResponse, null, 2));

    // Extract response message
    let responseMessage = 'I apologize, but I couldn\'t process that request.';
    let intentName = null;
    let slots = {};
    let dialogState = null;

    if (lexResponse.messages && lexResponse.messages.length > 0) {
      // Get the first message (usually the main response)
      const messageObj = lexResponse.messages[0];
      if (messageObj.content) {
        responseMessage = messageObj.content;
      }
    }

    // Extract intent information if available
    if (lexResponse.interpretations && lexResponse.interpretations.length > 0) {
      const interpretation = lexResponse.interpretations[0];
      intentName = interpretation.intent?.name || null;
      slots = interpretation.intent?.slots || {};
      dialogState = lexResponse.sessionState?.dialogAction?.type || null;
    }

    // Check if Lex is asking for more information
    const isElicitingSlot = dialogState === 'ElicitSlot';
    const isConfirmingIntent = dialogState === 'ConfirmIntent';
    const isReadyForFulfillment = dialogState === 'ReadyForFulfillment';

    // Improve default messages based on intent and slots
    if (intentName && slots) {
      // If we have slots filled, provide a better default message
      const productName = slots.ProductName?.value?.originalValue || slots.productName?.value?.originalValue;
      
      if (intentName === 'AddToCart' && productName) {
        // Don't override if Lex provided a good message, but provide fallback
        if (responseMessage.includes("couldn't process") || responseMessage.includes("apologize")) {
          responseMessage = `Got it! I'll help you add ${productName} to your cart.`;
        }
      } else if (intentName === 'RemoveFromCart' && productName) {
        if (responseMessage.includes("couldn't process") || responseMessage.includes("apologize")) {
          responseMessage = `I'll remove ${productName} from your cart.`;
        }
      } else if (intentName === 'AddToWishlist' && productName) {
        if (responseMessage.includes("couldn't process") || responseMessage.includes("apologize")) {
          responseMessage = `I'll add ${productName} to your wishlist.`;
        }
      } else if (intentName === 'SearchProducts' && productName) {
        if (responseMessage.includes("couldn't process") || responseMessage.includes("apologize")) {
          responseMessage = `I'll search for ${productName} for you.`;
        }
      }
    }

    return response(200, {
      success: true,
      message: responseMessage,
      sessionId: sessionIdentifier,
      intent: intentName,
      slots: slots,
      dialogState: dialogState,
      isElicitingSlot: isElicitingSlot,
      isConfirmingIntent: isConfirmingIntent,
      isReadyForFulfillment: isReadyForFulfillment,
      rawResponse: lexResponse, // Include for debugging (remove in production if needed)
    });
  } catch (error) {
    console.error('Lex error:', error);
    
    // Handle specific Lex errors
    if (error.code === 'BadRequestException') {
      return response(400, {
        success: false,
        message: 'Invalid request. Please try rephrasing your question.',
        error: error.message,
      });
    }
    
    if (error.code === 'NotFoundException') {
      return response(404, {
        success: false,
        message: 'Chat bot not found. Please contact support.',
        error: 'Bot configuration error',
      });
    }

    return response(500, {
      success: false,
      message: 'Failed to process your message. Please try again.',
      error: error.message,
    });
  }
};

