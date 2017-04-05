# Jackrabbit

RabbitMQ in Node.js without hating life.
Jackrabbit is designed for *simplicity* with an easy, async-await based API.

```
yarn add jackrabbit
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

## Use

Each of the official RabbitMQ tutorials has a corresponding test/example:

1. [Hello, world](test/hello.test.js)
2. Work queues
3. Pubsub
4. Routing
5. Topics
6. RPC


## Tests

The tests are set up with Docker + Docker-Compose,
so you don't need to install rabbitmq (or even node) to run them:

```
$ docker-compose run jackrabbit yarn test:suite
```
