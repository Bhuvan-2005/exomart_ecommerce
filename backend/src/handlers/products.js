const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.DYNAMODB_TABLE;

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400/667eea/ffffff?text=ExoMart';

const toArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const processProductImages = (payload = {}) => {
  const rawImages = [
    ...toArray(payload.images),
    ...toArray(payload.gallery),
  ];

  const cleanedImages = rawImages
    .map((url) => (typeof url === 'string' ? url.trim() : ''))
    .filter(Boolean);

  const providedMainImage =
    typeof payload.image === 'string' && payload.image.trim()
      ? payload.image.trim()
      : '';

  const mainImage = providedMainImage || cleanedImages[0] || PLACEHOLDER_IMAGE;
  const images = Array.from(new Set([mainImage, ...cleanedImages]));

  return { mainImage, images };
};

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
  body: JSON.stringify(body),
});

module.exports.getAll = async (event) => {
  try {
    const result = await dynamodb.scan({ 
      TableName: TABLE_NAME 
    }).promise();
    
    return response(200, { 
      success: true, 
      products: result.Items || [],
      count: result.Count || 0
    });
  } catch (error) {
    console.error('Error getting products:', error);
    return response(500, { 
      success: false, 
      message: 'Failed to retrieve products',
      error: error.message 
    });
  }
};

module.exports.getById = async (event) => {
  try {
    const { id } = event.pathParameters;
    const result = await dynamodb.get({ 
      TableName: TABLE_NAME, 
      Key: { id } 
    }).promise();
    
    if (!result.Item) {
      return response(404, { 
        success: false, 
        message: 'Product not found' 
      });
    }
    
    return response(200, { 
      success: true, 
      product: result.Item 
    });
  } catch (error) {
    console.error('Error getting product:', error);
    return response(500, { 
      success: false, 
      message: 'Failed to retrieve product',
      error: error.message 
    });
  }
};

module.exports.create = async (event) => {
  try {
    const data = JSON.parse(event.body);
    const { mainImage, images } = processProductImages(data);

    const product = {
      id: uuidv4(),
      name: data.name,
      description: data.description,
      price: parseFloat(data.price),
      category: data.category,
      image: mainImage,
      images,
      stock: parseInt(data.stock) || 100,
      createdAt: new Date().toISOString(),
    };

    await dynamodb.put({ 
      TableName: TABLE_NAME, 
      Item: product 
    }).promise();
    
    return response(201, { 
      success: true, 
      message: 'Product created successfully', 
      product 
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return response(500, { 
      success: false, 
      message: 'Failed to create product',
      error: error.message 
    });
  }
};

module.exports.update = async (event) => {
  try {
    const { id } = event.pathParameters;
    const data = JSON.parse(event.body);

    const { mainImage, images } = processProductImages(data);

    const result = await dynamodb.update({
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: 'set #name = :name, description = :description, price = :price, category = :category, image = :image, images = :images, stock = :stock, updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#name': 'name' },
      ExpressionAttributeValues: {
        ':name': data.name,
        ':description': data.description,
        ':price': parseFloat(data.price),
        ':category': data.category,
        ':image': mainImage,
        ':images': images,
        ':stock': parseInt(data.stock),
        ':updatedAt': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    }).promise();

    return response(200, { 
      success: true, 
      message: 'Product updated successfully', 
      product: result.Attributes 
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return response(500, { 
      success: false, 
      message: 'Failed to update product',
      error: error.message 
    });
  }
};

module.exports.delete = async (event) => {
  try {
    const { id } = event.pathParameters;
    await dynamodb.delete({ 
      TableName: TABLE_NAME, 
      Key: { id } 
    }).promise();
    
    return response(200, { 
      success: true, 
      message: 'Product deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return response(500, { 
      success: false, 
      message: 'Failed to delete product',
      error: error.message 
    });
  }
};
