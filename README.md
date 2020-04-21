# Jackrabbit

This is an actively maintained fork of [hunterloftis/jackrabbit], a library for
RabbitMQ in Node.js without hating life.

[![CircleCI](https://circleci.com/gh/pagerinc/jackrabbit.svg?style=svg)](https://circleci.com/gh/pagerinc/jackrabbit)

Jackrabbit is a very opinionated abstraction built on top of `amqplib` focused
on usability and implementing several messaging patterns on RabbitMQ.

## Simple Example

```js
// producer.js
'use strict';

const jackrabbit = require('@pager/jackrabbit');
const rabbit = jackrabbit(process.env.RABBIT_URL);

rabbit
  .default()
  .publish('Hello World!', { key: 'hello' })
  .on('drain', rabbit.close);
```

```js
// consumer.js
'use strict';

const jackrabbit = require('@pager/jackrabbit');
const rabbit = jackrabbit(process.env.RABBIT_URL);

rabbit
  .default()
  .queue({ name: 'hello' })
  .consume(onMessage, { noAck: true });

function onMessage(data) {
  console.log('received:', data);
}
```

## Ack/Nack Consumer Example

```js
'use strict';

const jackrabbit = require('@pager/jackrabbit');
const rabbit = jackrabbit(process.env.RABBIT_URL);

rabbit
  .default()
  .queue({ name: 'important_job' })
  .consume(function(data, ack, nack, msg) {
    // process data...
    // and ACK on success
    ack();
    // or alternatively NACK on failure
    nack();
  })
```

## More Examples

For now, the best usage help is can be found in [examples](https://github.com/pagerinc/jackrabbit/tree/master/examples),
which map 1-to-1 with the official RabbitMQ tutorials.

## Installation

```
npm install --save @pager/jackrabbit
```

## Tests

The tests are set up with Docker + Docker-Compose,
so you don't need to install rabbitmq (or even node)
to run them:

```
$ docker-compose up
```

[hunterloftis/jackrabbit]: https://github.com/hunterloftis/jackrabbit
