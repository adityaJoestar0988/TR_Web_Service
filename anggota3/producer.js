require('dotenv').config();
const amqp = require('amqplib');

async function sendOrderMessage() {
  try {
    // 1. Koneksi ke RabbitMQ
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await connection.createChannel();

    // 2. Nama exchange dan routing key (sesuai yang dibuat Anggota 2)
    const exchangeName = 'order_exchange';
    const routingKey = 'order.created';

    // PASTIKAN exchange dan queue sudah ada agar tidak error / hilang
    await channel.assertExchange(exchangeName, 'topic', { durable: true });
    await channel.assertQueue('order_created_queue', { durable: true });
    await channel.bindQueue('order_created_queue', exchangeName, routingKey);

    // Data pesanan dummy yang akan dikirim (sekarang bervariasi)
    const products = ['Laptop Gaming', 'Smartphone Android', 'Headset Bluetooth', 'Mouse Wireless'];
    const randomProduct = products[Math.floor(Math.random() * products.length)];

    const orderData = {
      orderId: 'ORD-' + Math.floor(Math.random() * 10000),
      product: randomProduct,
      quantity: Math.floor(Math.random() * 5) + 1, // 1 sampai 5
      price: Math.floor(Math.random() * 10) * 1000000 + 500000,
      timestamp: new Date().toISOString()
    };

    // 3. Mengirim pesan ke exchange
    const messageBuffer = Buffer.from(JSON.stringify(orderData));
    channel.publish(exchangeName, routingKey, messageBuffer);

    console.log(`✅ [Producer] Pesan berhasil dikirim ke exchange '${exchangeName}' dengan routing key '${routingKey}'`);
    console.log('Isi pesan:', orderData);

    // 4. Tutup koneksi setelah selesai mengirim
    setTimeout(() => {
      connection.close();
      process.exit(0);
    }, 500);
    
  } catch (error) {
    console.error('❌ Gagal mengirim pesan:', error);
  }
}

sendOrderMessage();
