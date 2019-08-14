var jackrabbit = require("../..");

var rabbit = jackrabbit(process.env.RABBIT_URL);
var exchange = rabbit.direct("direct_logs");

exchange.publish({ text: "this is a harmless log" }, { key: "info" });
exchange.publish({ text: "this one is more important" }, { key: "warning" });
exchange.publish({ text: "pay attention to me!" }, { key: "error" });
