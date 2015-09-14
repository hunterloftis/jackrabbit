# Jackrabbit

Simple AMQP / RabbitMQ job queues for node

producer.js:

```js
var jackrabbit = require('jackrabbit');
var rabbit = jackrabbit('amqp://localhost');

rabbit.assert('jobs.greet', { prefetch: 5 });
rabbit.publish('jobs.greet', { name: 'Hunter' });
```

consumer.js:

```js
var jackrabbit = require('jackrabbit');
var rabbit = jackrabbit('amqp://localhost');

rabbit.assert('jobs.greet', { prefetch: 5 });
rabbit.handle('jobs.greet', onGreet);

function onGreet(job, ack) {
  console.log('Hello, ' + job.name);
  ack();
}
```

## Installation

```
npm install --save jackrabbit
```

## API

First, create a jackrabbit instance,
which takes an amqp url as its only parameter:

```js
var jackrabbit = require('jackrabbit');
var rabbit = jackrabbit('amqp://localhost');
```

#### assert

Assert (or create) a queue.

```js
rabbit.assert(name, options, callback)
```

- name: String, queue name
  - eg, 'my-fancy-awesome.queue'
- options: Object (optional)
  - durable (Boolean, default = true)
  - prefetch (Number, default = 1)
- callback: Function (optional)
  - fn(err, queueInstance, queueInfo)

#### destroy

Destroy a queue.

```js
rabbit.destroy(name, callback)
```

- name: String, queue name
- callback: Function (optional)
  - fn(err, destroyed)

You can destroy queues that exist or don't exist;
if you try to destroy a queue that doesn't exist,
destroyed = false. If a queue was destroyed,
destroyed = true.

#### publish

Publish a job to a queue.

```js
rabbit.publish(name, message)
```

- name: String, queue name
- message: Object (optional)
  - contents are passed to any handlers

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

The tests are set up with Docker + Docker-Compose,
so you don't need to install rabbitmq (or even node)
to run them:

```
$ docker-compose run jackrabbit npm test
```
