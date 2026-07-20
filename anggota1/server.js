require('dotenv').config();
const express = require('express');
const amqp = require('amqplib');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const PORT = process.env.PORT || 3000;
const EXCHANGE = 'order_exchange';
const QUEUE = 'order_created_queue';
const ROUTING_KEY = 'order.created';

let publishChannel = null;
let connection = null;
let isConnected = false;
let stats = { sent: 0, received: 0, failed: 0 };

// Broadcast ke semua WebSocket client
function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

async function connectRabbitMQ() {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    const setupChannel = await connection.createChannel();
    publishChannel = await connection.createChannel();

    // Setup exchange & queue
    await setupChannel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await setupChannel.assertQueue(QUEUE, { durable: true });
    await setupChannel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

    // Consumer channel
    const consumeChannel = await connection.createChannel();
    await consumeChannel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await consumeChannel.assertQueue(QUEUE, { durable: true });
    await consumeChannel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

    consumeChannel.consume(QUEUE, (msg) => {
      if (!msg) return;
      try {
        const order = JSON.parse(msg.content.toString());
        stats.received++;
        broadcast({ type: 'ORDER_RECEIVED', order, stats });
        consumeChannel.ack(msg);
        console.log(`📦 Order diterima: ${order.orderId}`);
      } catch (err) {
        consumeChannel.nack(msg, false, false);
        stats.failed++;
      }
    });

    isConnected = true;
    broadcast({ type: 'CONNECTION_STATUS', connected: true, stats });
    console.log('✅ RabbitMQ Dashboard terhubung!');

    connection.on('error', (err) => {
      isConnected = false;
      broadcast({ type: 'CONNECTION_STATUS', connected: false, stats });
      console.error('RabbitMQ error:', err.message);
      setTimeout(connectRabbitMQ, 5000);
    });

    connection.on('close', () => {
      isConnected = false;
      broadcast({ type: 'CONNECTION_STATUS', connected: false, stats });
      console.warn('RabbitMQ disconnected, reconnecting...');
      setTimeout(connectRabbitMQ, 5000);
    });

  } catch (err) {
    isConnected = false;
    console.error('❌ Gagal konek RabbitMQ:', err.message);
    setTimeout(connectRabbitMQ, 5000);
  }
}

// API: Kirim order (producer)
app.post('/api/send-order', async (req, res) => {
  if (!isConnected || !publishChannel) {
    return res.status(503).json({ error: 'RabbitMQ tidak terhubung' });
  }

  try {
    const products = ['Laptop Gaming', 'Smartphone Android', 'Headset Bluetooth', 'Mouse Wireless', 'Keyboard Mechanical', 'Monitor 4K'];
    const product = req.body.product || products[Math.floor(Math.random() * products.length)];
    const quantity = req.body.quantity || Math.floor(Math.random() * 5) + 1;
    const price = req.body.price || Math.floor(Math.random() * 10) * 1000000 + 500000;

    const orderData = {
      orderId: 'ORD-' + Math.floor(Math.random() * 90000 + 10000),
      product,
      quantity: parseInt(quantity),
      price: parseInt(price),
      timestamp: new Date().toISOString(),
      source: 'dashboard'
    };

    const messageBuffer = Buffer.from(JSON.stringify(orderData));
    publishChannel.publish(EXCHANGE, ROUTING_KEY, messageBuffer, { persistent: true });

    stats.sent++;
    broadcast({ type: 'ORDER_SENT', order: orderData, stats });
    console.log(`📤 Order dikirim: ${orderData.orderId}`);
    res.json({ success: true, order: orderData });
  } catch (err) {
    stats.failed++;
    res.status(500).json({ error: err.message });
  }
});

// API: Status
app.get('/api/status', (req, res) => {
  res.json({ connected: isConnected, stats, exchange: EXCHANGE, queue: QUEUE });
});

// WebSocket: Kirim status awal saat client connect
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'CONNECTION_STATUS', connected: isConnected, stats }));
});

server.listen(PORT, () => {
  console.log(`🚀 Dashboard berjalan di http://localhost:${PORT}`);
  connectRabbitMQ();
});

// Mencegah server crash karena unhandled error
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err.message);
});
