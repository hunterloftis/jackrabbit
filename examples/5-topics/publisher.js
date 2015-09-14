var jackrabbit = require('../..');

var rabbit = jackrabbit(process.env.RABBIT_URL);
var exchange = rabbit.topic('topic_animals');

exchange
  .publish({ text: 'both queues 1' }, { key: 'quick.orange.rabbit' })
  .publish({ text: 'both queues 2' }, { key: 'lazy.orange.elephant' })
  .publish({ text: 'first queue 1' }, { key: 'quick.orange.fox' })
  .publish({ text: 'second queue 1' }, { key: 'lazy.brown.fox' })
  .publish({ text: 'second queue 2' }, { key: 'lazy.pink.rabbit' })
  .publish({ text: 'discarded' }, { key: 'quick.brown.fox' })
  .publish({ text: 'discarded' }, { key: 'orange' })
  .publish({ text: 'second queue 3' }, { key: 'lazy.orange.male.rabbit' })
  .on('drain', rabbit.close);
