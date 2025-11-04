const AWS = require('aws-sdk');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const response = (statusCode, body) =&gt; ({
statusCode,
headers: {
'Content-Type': 'application/json',
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Credentials': true,
},
body: JSON.stringify(body),
});
// Database connection
const getConnection = async () =&gt; {
return await mysql.createConnection({
host: process.env.RDS_HOST,
user: process.env.RDS_USER,
password: process.env.RDS_PASSWORD,
database: process.env.RDS_DATABASE,
});
};
// CREATE order
module.exports.create = async (event) =&gt; {
let connection;
try {
const data = JSON.parse(event.body);
const orderId = uuidv4();
connection = await getConnection();
// Create orders table if not exists
await connection.execute(`
CREATE TABLE IF NOT EXISTS orders (
id VARCHAR(36) PRIMARY KEY,
user_id VARCHAR(255) NOT NULL,
total_amount DECIMAL(10, 2) NOT NULL,
status VARCHAR(50) NOT NULL,
created_at DATETIME NOT NULL
)
`);
// Insert order
await connection.execute(
'INSERT INTO orders (id, user_id, total_amount, status, created_at) VALUES (?, ?, ?
[orderId, data.userId, data.totalAmount, 'pending', new Date()]
);
return response(201, { success: true, message: 'Order created successfully', orderId
} catch (error) {
console.error('Error:', error);
return response(500, { success: false, message: 'Failed to create order', error: erro
} finally {
if (connection) await connection.end();
}
};
// GET all orders
module.exports.getAll = async (event) =&gt; {
let connection;
try {
connection = await getConnection();
const [rows] = await connection.execute('SELECT * FROM orders ORDER BY created_at DES
return response(200, { success: true, orders: rows });
} catch (error) {
console.error('Error:', error);
return response(500, { success: false, message: 'Failed to retrieve orders', error: e
} finally {
if (connection) await connection.end();
}
};
