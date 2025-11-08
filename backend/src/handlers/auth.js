const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const USERS_TABLE = process.env.USERS_TABLE;

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
  body: JSON.stringify(body),
});

const sanitizeUser = (item) => {
  if (!item) {
    return null;
  }

  return {
    userId: item.userId,
    email: item.email,
    name: item.name,
    provider: item.provider || 'password',
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    lastLoginAt: item.lastLoginAt,
  };
};

module.exports.register = async (event) => {
  if (!USERS_TABLE) {
    console.error('USERS_TABLE environment variable is not set');
    return response(500, {
      success: false,
      message: 'Authentication service misconfigured',
    });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const name = (payload.name || '').trim();
    const email = (payload.email || '').trim().toLowerCase();
    const password = payload.password || '';

    if (!name || !email || !password) {
      return response(400, {
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    if (password.length < 6) {
      return response(400, {
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const existingUser = await dynamodb
      .get({
        TableName: USERS_TABLE,
        Key: { email },
      })
      .promise();

    if (existingUser.Item) {
      return response(409, {
        success: false,
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const timestamp = new Date().toISOString();

    const userItem = {
      email,
      userId: uuidv4(),
      name,
      passwordHash,
      provider: 'password',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await dynamodb
      .put({
        TableName: USERS_TABLE,
        Item: userItem,
        ConditionExpression: 'attribute_not_exists(email)',
      })
      .promise();

    return response(201, {
      success: true,
      message: 'User registered successfully',
      user: sanitizeUser(userItem),
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return response(500, {
      success: false,
      message: 'Failed to register user',
      error: error.message,
    });
  }
};

module.exports.login = async (event) => {
  if (!USERS_TABLE) {
    console.error('USERS_TABLE environment variable is not set');
    return response(500, {
      success: false,
      message: 'Authentication service misconfigured',
    });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const email = (payload.email || '').trim().toLowerCase();
    const password = payload.password || '';

    if (!email || !password) {
      return response(400, {
        success: false,
        message: 'Email and password are required',
      });
    }

    const result = await dynamodb
      .get({
        TableName: USERS_TABLE,
        Key: { email },
      })
      .promise();

    if (!result.Item) {
      return response(401, {
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isValidPassword = await bcrypt.compare(
      password,
      result.Item.passwordHash
    );

    if (!isValidPassword) {
      return response(401, {
        success: false,
        message: 'Invalid email or password',
      });
    }

    const lastLoginAt = new Date().toISOString();

    await dynamodb
      .update({
        TableName: USERS_TABLE,
        Key: { email },
        UpdateExpression: 'set lastLoginAt = :lastLogin, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':lastLogin': lastLoginAt,
          ':updatedAt': lastLoginAt,
        },
      })
      .promise();

    const sanitizedUser = sanitizeUser({
      ...result.Item,
      lastLoginAt,
      updatedAt: lastLoginAt,
    });

    return response(200, {
      success: true,
      message: 'Login successful',
      user: sanitizedUser,
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return response(500, {
      success: false,
      message: 'Failed to login',
      error: error.message,
    });
  }
};

