module.exports = {
  RABBIT_URL: process.env.RABBIT_URL || 'amqp://localhost',
  NAME: 'test.queue.' + Math.round(Math.random() * 100000)
};
