var jackrabbit = require("../..");

var rabbit = jackrabbit(process.env.RABBIT_URL);
var exchange = rabbit.default();
var rpc = exchange.queue({ name: "rpc_queue", prefetch: 1, durable: false });

exchange.publish(
  { n: 40 },
  {
    key: "rpc_queue",
    reply: onReply // auto sends necessary info so the reply can come to the exclusive reply-to queue for this rabbit instance
  }
);

function onReply(data) {
  console.log("result:", data.result);
  rabbit.close();
}
