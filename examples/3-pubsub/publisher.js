var jackrabbit = require("../..");

var rabbit = jackrabbit(process.env.RABBIT_URL);
var exchange = rabbit.fanout();

exchange.publish("this is a log");
exchange.on("drain", process.exit);
