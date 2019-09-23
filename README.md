# Jackrabbit

RabbitMQ in Node.js without hating life.

[![CircleCI](https://circleci.com/gh/pagerinc/jackrabbit.svg?style=svg)](https://circleci.com/gh/pagerinc/jackrabbit)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Simple Example

*producer.js:*

```js
var jackrabbit = require('jackrabbit');
var rabbit = jackrabbit(process.env.RABBIT_URL);

rabbit
  .default()
  .publish('Hello World!', { key: 'hello' })
  .on('drain', rabbit.close);
```

*consumer.js:*

```js
var jackrabbit = require('jackrabbit');
var rabbit = jackrabbit(process.env.RABBIT_URL);

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
var jackrabbit = require('jackrabbit');
var rabbit = jackrabbit(process.env.RABBIT_URL);

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

Jackrabbit is designed for *simplicity* and an easy API.
If you're an AMQP expert and want more power and flexibility,
check out [wascally](https://github.com/LeanKit-Labs/wascally).

## More Examples

For now, the best usage help is can be found in [examples](https://github.com/hunterloftis/jackrabbit/tree/master/examples),
which map 1-to-1 with the official RabbitMQ tutorials.

## Installation

```
npm install --save jackrabbit
```

## Tests

The tests are set up with Docker + Docker-Compose,
so you don't need to install rabbitmq (or even node)
to run them:

```
$ docker-compose up
```
