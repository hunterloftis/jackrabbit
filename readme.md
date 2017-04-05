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

## Why?

Jackrabbit is essentially a bookkeeping library.
RabbitMQ requires all sorts of bookkeeping - names and properties
of queues, exchanges, channels, connections, replyTos, correlation IDs -
and Jackrabbit handles the bookkeeping so you can focus on application logic.

## Documentation

### AMQP Concepts

RabbitMQ is an implementation of the AMQP 0.9.1 protocol,
so it's a good idea to get familiar with
[AMQP concepts](http://www.rabbitmq.com/tutorials/amqp-concepts.html).
However, if you just want to dive right in, here's the gist:

![RabbitMQ Concepts](https://cloud.githubusercontent.com/assets/364501/24713529/f614f4d2-19f3-11e7-9551-c05017e07261.png)

RabbitMQ manages **Exchanges** and **Queues,**
both of which you can create with various options.
Your node apps *publish* messages *to* Exchanges
and *consume* messages *from* Queues.

RabbitMQ routes messages from **Exchanges** to **Queues** based on routing rules.
You control routing rules by setting Exchange types (direct, fanout, topic),
specifying keys for messages, and binding Queues to specific keys.

### Architecture

When designing a microservice-based architecture based on RabbitMQ,
it can help to think visually about how data should pass through your services.
How should you configure and connect your Exchanges and Queues?

![patterns](https://cloud.githubusercontent.com/assets/364501/24723674/6c97a902-1a16-11e7-987f-5165d58f9bc4.png)

## Examples

Each of the [six official RabbitMQ tutorials](https://www.rabbitmq.com/getstarted.html)
has a corresponding test/example:

1. [Hello, world](test/hello.test.js)
2. [Work queues](test/work.test.js)
3. [Pubsub](test/pubsub.test.js)
4. [Routing](test/routing.test.js)
5. [Topics](test/topics.test.js)
6. [RPC](test/rpc.test.js)

## Tests

The tests are set up with Docker-Compose,
so you don't need to install rabbitmq (or even node) to run them:

```
$ docker-compose run jackrabbit yarn test:suite
```
