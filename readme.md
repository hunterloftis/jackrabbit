# Jackrabbit

[![Build Status][travis-image]][travis-url] [![NPM version][npm-image]][npm-url]

[RabbitMQ](https://www.rabbitmq.com/) in Node.js without hating life.

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
    // NOTE: this will requeue automatically
    nack();

    // or, if you want to nack without requeue:
    nack({
      requeue: false
    });
  })
```

Jackrabbit is designed for *simplicity* and an easy API.
If you're an AMQP expert and want more power and flexibility,
check out [Rabbot](https://github.com/arobson/rabbot).

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

## Release

Releases should be tagged according to [Semantic Versioning](https://semver.org/)

Process:

- Add release notes to `releases.md`
- Commit add push the release notes `git commit releases.md && git push origin master`
- Release it `./node_modules/release-it/bin/release-it.js`
