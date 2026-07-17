require('dotenv').config();
const amqp = require('amqplib');

let channel = null;

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange('order_exchange', 'topic', { durable: true });
    await channel.assertQueue('order_created_queue', { durable: true });
    await channel.bindQueue('order_created_queue', 'order_exchange', 'order.created');

    console.log('✅ RabbitMQ connected, exchange & queue ready');

    connection.on('error', (err) => console.error('RabbitMQ connection error:', err));
    connection.on('close', () => console.warn('RabbitMQ connection closed'));

    return channel;
  } catch (err) {
    console.error('❌ Failed to connect RabbitMQ:', err.message);
    throw err;
  }
}

function getChannel() {
  if (!channel) throw new Error('RabbitMQ channel belum siap');
  return channel;
}

module.exports = { connectRabbitMQ, getChannel };