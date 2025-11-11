const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS({ region: process.env.AWS_REGION || 'us-east-1' });
const PAYMENTS_TABLE = process.env.PAYMENTS_TABLE;
const PAYMENT_TOPIC_ARN = process.env.PAYMENT_TOPIC_ARN; // SNS Topic ARN for payment notifications

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
  body: JSON.stringify(body),
});

const sanitizeAmount = (amount) => {
  const parsed = Number(amount);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.round(parsed * 100) / 100;
  }
  return null;
};

module.exports.process = async (event) => {
  if (!PAYMENTS_TABLE) {
    console.error('PAYMENTS_TABLE environment variable is not set');
    return response(500, {
      success: false,
      message: 'Payment service misconfigured',
    });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const userId = (payload.userId || '').trim();
    const orderId = (payload.orderId || '').trim();
    const amount = sanitizeAmount(payload.amount);
    const currency = (payload.currency || 'INR').toUpperCase();
    const method = (payload.method || 'card').toLowerCase();
    const items = Array.isArray(payload.items) ? payload.items : [];
    const metadata = typeof payload.metadata === 'object' && payload.metadata !== null ? payload.metadata : {};

    if (!userId) {
      return response(400, { success: false, message: 'userId is required' });
    }

    if (!amount) {
      return response(400, { success: false, message: 'Valid amount is required' });
    }

    if (currency !== 'INR') {
      return response(400, { success: false, message: 'Only INR payments are supported' });
    }

    let paymentMethodData = null;

    if (method === 'card') {
      const card = payload.card || {};
      const cardNumber = typeof card.number === 'string' ? card.number.replace(/\s+/g, '') : '';
      const cardHolder = typeof card.name === 'string' ? card.name.trim() : '';
      const expiry = typeof card.expiry === 'string' ? card.expiry.trim() : '';

      if (!cardHolder || cardNumber.length < 12 || !expiry) {
        return response(400, { success: false, message: 'Complete card details are required' });
      }

      paymentMethodData = {
        card: {
          brand: card.brand || 'Card',
          last4: cardNumber ? cardNumber.slice(-4) : null,
          holder: cardHolder,
          expiry,
        },
      };
    } else if (method === 'netbanking') {
      const netbanking = payload.netbanking || {};
      const bank = typeof netbanking.bank === 'string' ? netbanking.bank.trim() : '';
      const accountName = typeof netbanking.accountName === 'string' ? netbanking.accountName.trim() : '';

      if (!bank || !accountName) {
        return response(400, { success: false, message: 'Bank selection and account holder name are required' });
      }

      paymentMethodData = {
        netbanking: {
          bank,
          accountName,
        },
      };
    } else if (method === 'upi') {
      const upi = payload.upi || {};
      const upiId = typeof upi.id === 'string' ? upi.id.trim() : '';
      const provider = typeof upi.provider === 'string' ? upi.provider.trim() : '';

      if (!upiId || !provider) {
        return response(400, { success: false, message: 'UPI ID and provider are required' });
      }

      paymentMethodData = {
        upi: {
          id: upiId,
          provider,
        },
      };
    } else {
      return response(400, { success: false, message: 'Invalid payment method. Supported: card, netbanking, upi' });
    }

    const paymentId = uuidv4();
    const now = new Date().toISOString();

    const paymentRecord = {
      paymentId,
      userId,
      orderId: orderId || null,
      amount,
      currency,
      method,
      items,
      status: 'success',
      ...paymentMethodData,
      metadata,
      createdAt: now,
      processedAt: now,
    };

    await dynamodb.put({
      TableName: PAYMENTS_TABLE,
      Item: paymentRecord,
    }).promise();

    // Send SNS notification for payment success
    if (PAYMENT_TOPIC_ARN) {
      try {
        const userEmail = metadata.email || null;
        
        const paymentMethod = method === 'card' 
          ? `Card ending in ${paymentMethodData.card.last4}`
          : method === 'upi'
          ? `UPI (${paymentMethodData.upi.provider})`
          : `Net Banking (${paymentMethodData.netbanking.bank})`;

        const message = {
          paymentId,
          userId,
          orderId: orderId || 'N/A',
          amount,
          currency,
          method: paymentMethod,
          status: 'success',
          itemsCount: items.length,
          processedAt: now,
          email: userEmail,
        };

        await sns.publish({
          TopicArn: PAYMENT_TOPIC_ARN,
          Subject: `Payment Successful - ₹${amount} - ExoMart`,
          Message: JSON.stringify({
            default: JSON.stringify(message, null, 2),
            email: `
Payment Successful - ExoMart

Dear Customer,

Your payment of ₹${amount} has been processed successfully.

Payment Details:
- Payment ID: ${paymentId}
- Order ID: ${orderId || 'N/A'}
- Amount: ₹${amount} ${currency}
- Payment Method: ${paymentMethod}
- Items: ${items.length} item(s)
- Date: ${new Date(now).toLocaleString('en-IN')}

Thank you for your purchase!

Best regards,
ExoMart Team
            `.trim(),
            sms: `Payment successful! ₹${amount} paid via ${paymentMethod}. Payment ID: ${paymentId.substring(0, 8)}. - ExoMart`,
          }, null, 2),
          MessageStructure: 'json',
        }).promise();

        console.log(`Payment notification sent to SNS topic: ${PAYMENT_TOPIC_ARN}`);
      } catch (snsError) {
        // Don't fail payment if notification fails
        console.error('Error sending payment notification:', snsError);
      }
    }

    return response(201, {
      success: true,
      message: 'Payment processed successfully',
      payment: {
        paymentId,
        status: paymentRecord.status,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        method: paymentRecord.method,
        card: paymentRecord.card || null,
        netbanking: paymentRecord.netbanking || null,
        upi: paymentRecord.upi || null,
        processedAt: paymentRecord.processedAt,
      },
    });
  } catch (error) {
    console.error('Payment processing error:', error);
    return response(500, {
      success: false,
      message: 'Failed to process payment',
      error: error.message,
    });
  }
};

module.exports.get = async (event) => {
  if (!PAYMENTS_TABLE) {
    return response(500, {
      success: false,
      message: 'Payment service misconfigured',
    });
  }

  try {
    const { paymentId } = event.pathParameters || {};
    if (!paymentId) {
      return response(400, { success: false, message: 'paymentId is required' });
    }

    const result = await dynamodb.get({
      TableName: PAYMENTS_TABLE,
      Key: { paymentId },
    }).promise();

    if (!result.Item) {
      return response(404, { success: false, message: 'Payment not found' });
    }

    return response(200, {
      success: true,
      payment: result.Item,
    });
  } catch (error) {
    console.error('Payment retrieval error:', error);
    return response(500, {
      success: false,
      message: 'Failed to fetch payment details',
      error: error.message,
    });
  }
};

