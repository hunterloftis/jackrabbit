var jackrabbit = require("../..");

var rabbit = jackrabbit(process.env.RABBIT_URL);
var exchange = rabbit.direct();
var hello = exchange.queue({ name: "task_queue", durable: true });

hello.consume(onGreet);

function onGreet(data, ack) {
  console.log("Hola, " + data.name + "!");
  ack();
}
