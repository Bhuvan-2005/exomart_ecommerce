const AWS = require('aws-sdk');
const crypto = require('crypto');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const ses = new AWS.SES({ region: process.env.AWS_REGION || 'us-east-1' });

const OTP_TABLE = process.env.OTP_TABLE;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@exomart.com';
const OTP_EXPIRY_MINUTES = 10;

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
  body: JSON.stringify(body),
});

// Generate 6-digit OTP
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

// Send OTP via SES
module.exports.send = async (event) => {
  if (!OTP_TABLE) {
    console.error('OTP_TABLE environment variable is not set');
    return response(500, {
      success: false,
      message: 'OTP service misconfigured',
    });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const email = (payload.email || '').trim().toLowerCase();
    const purpose = (payload.purpose || 'verification').trim(); // 'verification' or 'payment'

    if (!email) {
      return response(400, {
        success: false,
        message: 'Email is required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return response(400, {
        success: false,
        message: 'Invalid email format',
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    // Store OTP in DynamoDB
    const otpItem = {
      email,
      otp,
      purpose,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      attempts: 0,
      verified: false,
    };

    await dynamodb.put({
      TableName: OTP_TABLE,
      Item: otpItem,
    }).promise();

    // Prepare email content
    let subject, htmlBody, textBody;

    if (purpose === 'payment') {
      subject = 'ExoMart - Payment Verification OTP';
      htmlBody = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb;">Payment Verification</h2>
              <p>Your OTP for payment verification is:</p>
              <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                <h1 style="color: #2563eb; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
              </div>
              <p>This OTP is valid for ${OTP_EXPIRY_MINUTES} minutes.</p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                If you did not request this OTP, please ignore this email.
              </p>
            </div>
          </body>
        </html>
      `;
      textBody = `Your OTP for payment verification is: ${otp}. This OTP is valid for ${OTP_EXPIRY_MINUTES} minutes.`;
    } else {
      subject = 'ExoMart - Email Verification OTP';
      htmlBody = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb;">Welcome to ExoMart!</h2>
              <p>Thank you for signing up. Please verify your email address using the OTP below:</p>
              <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                <h1 style="color: #2563eb; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
              </div>
              <p>This OTP is valid for ${OTP_EXPIRY_MINUTES} minutes.</p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                If you did not create an account with ExoMart, please ignore this email.
              </p>
            </div>
          </body>
        </html>
      `;
      textBody = `Your email verification OTP is: ${otp}. This OTP is valid for ${OTP_EXPIRY_MINUTES} minutes.`;
    }

    // Send email via SES
    const emailParams = {
      Source: FROM_EMAIL,
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
        },
      },
    };

    await ses.sendEmail(emailParams).promise();

    console.log(`OTP sent to ${email} for purpose: ${purpose}`);

    return response(200, {
      success: true,
      message: 'OTP sent successfully to your email',
      expiresIn: OTP_EXPIRY_MINUTES * 60, // in seconds
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    
    // Handle SES-specific errors
    if (error.code === 'MessageRejected' || error.code === 'MailFromDomainNotVerifiedException') {
      return response(500, {
        success: false,
        message: 'Email service is not configured. Please contact support.',
        error: 'SES_NOT_CONFIGURED',
      });
    }

    return response(500, {
      success: false,
      message: 'Failed to send OTP',
      error: error.message,
    });
  }
};

// Verify OTP
module.exports.verify = async (event) => {
  if (!OTP_TABLE) {
    console.error('OTP_TABLE environment variable is not set');
    return response(500, {
      success: false,
      message: 'OTP service misconfigured',
    });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const email = (payload.email || '').trim().toLowerCase();
    const otp = (payload.otp || '').trim();
    const purpose = (payload.purpose || 'verification').trim();

    if (!email || !otp) {
      return response(400, {
        success: false,
        message: 'Email and OTP are required',
      });
    }

    // Get OTP record from DynamoDB
    const result = await dynamodb.get({
      TableName: OTP_TABLE,
      Key: { email },
    }).promise();

    if (!result.Item) {
      return response(404, {
        success: false,
        message: 'OTP not found. Please request a new OTP.',
      });
    }

    const otpRecord = result.Item;

    // Check if already verified
    if (otpRecord.verified) {
      return response(400, {
        success: false,
        message: 'This OTP has already been used.',
      });
    }

    // Check if expired
    const expiresAt = new Date(otpRecord.expiresAt);
    const now = new Date();
    if (now > expiresAt) {
      return response(400, {
        success: false,
        message: 'OTP has expired. Please request a new OTP.',
      });
    }

    // Check purpose match
    if (otpRecord.purpose !== purpose) {
      return response(400, {
        success: false,
        message: 'Invalid OTP purpose.',
      });
    }

    // Check attempts (max 5 attempts)
    const maxAttempts = 5;
    if (otpRecord.attempts >= maxAttempts) {
      return response(400, {
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP.',
      });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      // Increment attempts
      await dynamodb.update({
        TableName: OTP_TABLE,
        Key: { email },
        UpdateExpression: 'set attempts = :attempts',
        ExpressionAttributeValues: {
          ':attempts': (otpRecord.attempts || 0) + 1,
        },
      }).promise();

      const remainingAttempts = maxAttempts - (otpRecord.attempts || 0) - 1;
      return response(400, {
        success: false,
        message: `Invalid OTP. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining.` : 'Please request a new OTP.'}`,
      });
    }

    // Mark OTP as verified
    await dynamodb.update({
      TableName: OTP_TABLE,
      Key: { email },
      UpdateExpression: 'set verified = :verified, verifiedAt = :verifiedAt',
      ExpressionAttributeValues: {
        ':verified': true,
        ':verifiedAt': new Date().toISOString(),
      },
    }).promise();

    console.log(`OTP verified for ${email} for purpose: ${purpose}`);

    return response(200, {
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return response(500, {
      success: false,
      message: 'Failed to verify OTP',
      error: error.message,
    });
  }
};

