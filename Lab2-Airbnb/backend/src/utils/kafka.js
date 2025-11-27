const { Kafka } = require('kafkajs');

const brokerList = (process.env.KAFKA_BROKER_URL || 'kafka:9092')
  .split(',')
  .map(b => b.trim())
  .filter(Boolean);

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'airbnb-backend',
  brokers: brokerList
});

const producer = kafka.producer();
let producerReady = false;

const ensureProducer = async () => {
  if (!producerReady) {
    await producer.connect();
    producerReady = true;
  }
  return producer;
};

const sendEvent = async (topic, payload) => {
  if (!topic) {
    console.warn('Kafka topic not configured, skipping publish');
    return;
  }

  try {
    const client = await ensureProducer();
    await client.send({
      topic,
      messages: [{ value: JSON.stringify(payload) }]
    });
  } catch (error) {
    console.error('Kafka publish error:', error.message);
  }
};

module.exports = {
  sendEvent
};
