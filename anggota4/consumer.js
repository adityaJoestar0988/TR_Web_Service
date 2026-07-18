// ======================================================
// RabbitMQ Consumer - Anggota 4
// Topik 2 : RabbitMQ & Order
// Tugas : Consumer (Choreography)
// ======================================================

// Membaca file .env
require("dotenv").config();

// Library RabbitMQ
const amqp = require("amqplib");

// ======================================================
// Konfigurasi RabbitMQ
// ======================================================

// URL RabbitMQ diambil dari file .env
const RABBITMQ_URL = process.env.RABBITMQ_URL;

// Nama Exchange
const EXCHANGE = "order_exchange";

// Routing Key
const ROUTING_KEY = "order.created";

// Queue yang akan didengarkan Consumer
const QUEUE = "order_created_queue";

// Menghitung jumlah pesan yang diterima
let totalMessage = 0;

// ======================================================
// Fungsi utama Consumer
// ======================================================

async function startConsumer() {

    try {

        console.log("=================================================");
        console.log(" RabbitMQ Consumer Service");
        console.log("=================================================");

        console.log("[INFO] Connecting to RabbitMQ...\n");

        // Membuat koneksi ke RabbitMQ
        const connection = await amqp.connect(RABBITMQ_URL);

        // Membuat channel komunikasi
        const channel = await connection.createChannel();

        // Memastikan Exchange tersedia
        await channel.assertExchange(
            EXCHANGE,
            "topic",
            {
                durable: true
            }
        );

        // Memastikan Queue tersedia
        await channel.assertQueue(
            QUEUE,
            {
                durable: true
            }
        );

        // Menghubungkan Queue dengan Exchange
        await channel.bindQueue(
            QUEUE,
            EXCHANGE,
            ROUTING_KEY
        );

        console.log("[SUCCESS] Connected to RabbitMQ");
        console.log("[INFO] Exchange :", EXCHANGE);
        console.log("[INFO] Queue    :", QUEUE);
        console.log("[INFO] Routing  :", ROUTING_KEY);

        console.log("\n=================================================");
        console.log(" Waiting for Order Event...");
        console.log("=================================================\n");

        // ======================================================
        // Listener Consumer
        // Otomatis dipanggil ketika ada pesan baru
        // ======================================================

        channel.consume(

            QUEUE,

            (msg) => {

                // Jika pesan kosong, abaikan
                if (!msg) return;

                // Menambah jumlah pesan yang diterima
                totalMessage++;

                try {

                    // Mengubah Buffer menjadi Object JSON
                    const order = JSON.parse(
                        msg.content.toString()
                    );

                    // Waktu pesan diterima Consumer
                    const receiveTime =
                        new Date().toLocaleString("id-ID");

                    console.log("=================================================");
                    console.log(" EVENT : ORDER_CREATED");
                    console.log("=================================================");

                    console.log("Message Number :", totalMessage);
                    console.log("Received Time  :", receiveTime);

                    console.log("-----------------------------------------------");

                    console.log("Order ID       :", order.orderId);
                    console.log("Product        :", order.product);
                    console.log("Quantity       :", order.quantity);

                    console.log(
                        "Price          : Rp",
                        order.price.toLocaleString("id-ID")
                    );

                    console.log("Timestamp      :", order.timestamp);

                    console.log("-----------------------------------------------");

                    console.log("[SUCCESS] Message Processed");

                    console.log("=================================================\n");

                    // Memberi tahu RabbitMQ
                    // bahwa pesan sudah berhasil diproses
                    channel.ack(msg);

                }

                catch (error) {

                    console.log("=================================================");
                    console.log("[ERROR] Invalid Message");
                    console.log(error.message);
                    console.log("=================================================\n");

                    // Pesan dianggap gagal diproses
                    channel.nack(
                        msg,
                        false,
                        false
                    );

                }

            }

        );

        // ======================================================
        // Graceful Shutdown
        // Menutup koneksi jika CTRL + C ditekan
        // ======================================================

        process.on(

            "SIGINT",

            async () => {

                console.log("\n");

                console.log("[INFO] Closing RabbitMQ Consumer...");

                await channel.close();

                await connection.close();

                console.log("[SUCCESS] Consumer Stopped");

                process.exit(0);

            }

        );

    }

    catch (error) {

        console.log("=================================================");
        console.log("[ERROR] RabbitMQ Connection Failed");
        console.log(error.message);
        console.log("=================================================");

    }

}

// Menjalankan Consumer
startConsumer();
