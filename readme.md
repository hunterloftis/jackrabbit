# Jackrabbit

Simple AMQP / RabbitMQ job queues for node

```js
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
  }
});
```

## Installation

```
npm install --save jackrabbit
```

```js
var jackrabbit = require('jackrabbit');
```

## Use

First, create a queue and connect to an amqp server:

```js
var queue = jackrabbit(amqp_url, prefetch)
```

- amqp_url: eg, 'amqp://localhost'
- prefetch: messages to prefetch (default = 1)

#### create

Create (or assert) a queue.

```js
queue.create(name, options, callback)
```

- name: name of the queue (eg, 'jobs.scrape')
- options: object with...
  - durable (Boolean, default = true)
  - prefetch (Number, default = 1)
- callback: callback function for result (err, queue_instance, queue_info)

#### destroy

Destroy a queue.

```js
queue.destroy(name, callback)
```

- name: name of the queue
- callback: callback for result (err, destroyed)

You can destroy queues that exist or don't exist;
if you try to destroy a queue that doesn't exist,
destroyed = false. If a queue was destroyed,
destroyed = true.

#### publish

Publish a job to a queue.

```js
queue.publish(name, message)
```

- name: name of the queue
- message: an Object that is your message / job to add to the queue

#### handle

Start handling jobs in a queue.

```js
queue.handle(name, handler)
```

- name: name of the queue
- handler: a Function to receive jobs (job, ack)

Jobs must be acknowledged. You can either ack immediately
(so all jobs will be run at most once) or
you can ack on job completion (so all jobs will run at least once).

#### ignore

Stop handling a queue.

```js
queue.ignore(name)
```

- name: name of the queue

#### purge

Purge a queue.

```js
queue.purge(name, callback);
```

- name: name of the queue
- callback: Function to be called on completion with (err, countOfPurgedMessages)

## Tests

1. Run rabbit on 'amqp://localhost'
2. `npm test`
