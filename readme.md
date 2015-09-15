# Jackrabbit

RabbitMQ in Node.js without hating life.

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

## Use

For now, the best usage help is found in the examples,
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
$ docker-compose run jackrabbit npm test
```
