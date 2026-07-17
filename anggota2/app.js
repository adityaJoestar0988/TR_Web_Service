const { connectRabbitMQ } = require('./config/rabbitmq');

async function start() {
  await connectRabbitMQ();
  console.log('Aplikasi siap jalan');
}

start();