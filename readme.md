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

## Documentation

RabbitMQ is an implementation of the AMQP 0.9.1 protocol,
so it's a good idea to get familiar with
[AMQP concepts](http://www.rabbitmq.com/tutorials/amqp-concepts.html).
However, if you just want to dive right in, here's the gist:

![RabbitMQ Concepts](http://www.rabbitmq.com/img/tutorials/intro/hello-world-example-routing.png)

- RabbitMQ manages **Exchanges** and **Queues,**
both of which you can create with various options.
- **Publishers** publish messages to **Exchanges**.
You can write **Publishers** in node with Jackrabbit.
- **Consumers** consume messages from **Queues**
- Messages move from **Exchanges** to **Queues** based on routing rules.
You control routing rules by setting **Exchange** types (direct, fanout, topic),
setting routing keys on messages, and binding **Queues** to specific keys.

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
