var jackrabbit = require('./');
var queue = jackrabbit('amqp://localhost');

queue.on('connected', function() {
  queue.create('jobs.greet', { prefetch: 5 }, onReady);

  function onReady() {
    queue.handle('jobs.greet', onJob);
    queue.publish('jobs.greet', { name: 'Hunter' });
  }

  function onJob(job, ack) {
    console.log('Hello, ' + job.name);
    ack();
    process.exit();
  }
});
