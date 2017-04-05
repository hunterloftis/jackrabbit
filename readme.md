# Jackrabbit

RabbitMQ in Node.js without hating life.

Designed for simplicity with an async-await based API.

```
$ yarn add jackrabbit
```

## Hello, world

*producer.js:*

```js
const exchange = await jackrabbit(RABBIT_URL).exchange()
exchange.publish('Hello, world', 'my-queue')
exchange.once('drain', exchange.close)
```

*consumer.js:*

```js
const queue = await jackrabbit(RABBIT_URL).queue({ name: 'my-queue' })
queue.consume(data => console.log(`received: ${data}`))
```

## Examples

Each of the official RabbitMQ tutorials has a corresponding test/example:

1. [Hello, world](test/hello.test.js)
2. [Work queues](test/work.test.js)
3. [Pubsub](test/pubsub.test.js)
4. [Routing](test/routing.test.js)
5. [Topics](test/topics.test.js)
6. [RPC](test/rpc.test.js)

## Tests

The tests are set up with Docker + Docker-Compose,
so you don't need to install rabbitmq (or even node) to run them:

```
$ docker-compose run jackrabbit yarn test:suite
```
