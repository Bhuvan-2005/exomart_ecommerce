const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const CART_TABLE = process.env.CART_TABLE;

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
  body: JSON.stringify(body),
});

module.exports.add = async (event) => {
  try {
    const data = JSON.parse(event.body);
    await dynamodb.put({
      TableName: CART_TABLE,
      Item: {
        userId: data.userId,
        productId: data.productId,
        quantity: parseInt(data.quantity),
        addedAt: new Date().toISOString(),
      },
    }).promise();
    
    return response(200, { 
      success: true, 
      message: 'Item added to cart' 
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    return response(500, { 
      success: false, 
      message: 'Failed to add to cart',
      error: error.message 
    });
  }
};

module.exports.get = async (event) => {
  try {
    const { userId } = event.pathParameters;
    const result = await dynamodb.query({
      TableName: CART_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
    }).promise();
    
    return response(200, { 
      success: true, 
      cart: result.Items || [] 
    });
  } catch (error) {
    console.error('Error getting cart:', error);
    return response(500, { 
      success: false, 
      message: 'Failed to retrieve cart',
      error: error.message 
    });
  }
};
