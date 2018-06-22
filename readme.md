# Jackrabbit

[![Build Status][travis-image]][travis-url] [![NPM version][npm-image]][npm-url]

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

Jackrabbit is designed for *simplicity* and an easy API.
If you're an AMQP expert and want more power and flexibility,
check out [Rabbot](https://github.com/arobson/rabbot).

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

If using Docker-Machine on OSX:

```
$ docker-machine start
$ eval "$(docker-machine env default)"
$ docker-compose run jackrabbit npm test
```

[npm-image]: https://img.shields.io/npm/v/jackrabbit.svg?style=flat-square
[npm-url]: https://npmjs.org/package/jackrabbit
[travis-image]: https://travis-ci.org/hunterloftis/jackrabbit.svg?branch=master
[travis-url]: https://travis-ci.org/hunterloftis/jackrabbit