describe('jackrabbit', function() {

  describe('queue prefetch', function() {

    describe('of value 1', function() {

      before(function connect(done) {
        this.queue = jackrabbit(RABBIT_URL, 1);
        this.queue.once('connected', done);
      });

      before(function createQueue(done) {
        this.name = QUEUE_NAME + '.prefetch';
        this.queue.create(this.name, done);
      });

      before(function publishTen() {
        var i = 10;
        while (i--) this.queue.publish(this.name, { remaining: i });
      });

      after(function(done) {
        this.queue.destroy(this.name, done);
      });

      it('knows to prefetch 1 message', function() {
        assert.equal(this.queue.prefetch, 1);
      });

      it('fetches 1 messages before pausing', function(done) {
        var i = 0;
        setTimeout(function checkFetched() {
          assert.equal(i, 1);
          done();
        }, 50);
        this.queue.handle(this.name, function handler(msg, acknowledge) {
          i++;
          assert.equal(msg.remaining, 10 - i);
          if (i > 1) throw new Error('Prefetched more than 1');
        });
      });
    });

    describe('of value 5', function() {

      before(function connect(done) {
        this.queue = jackrabbit(RABBIT_URL, 5);
        this.queue.once('connected', done);
      });

      before(function createQueue(done) {
        this.name = QUEUE_NAME + '.prefetch';
        this.queue.create(this.name, done);
      });

      before(function publishTen() {
        var i = 10;
        while (i--) this.queue.publish(this.name, { remaining: i });
      });

      after(function(done) {
        this.queue.destroy(this.name, done);
      });

      it('knows to prefetch 5 messages', function() {
        assert.equal(this.queue.prefetch, 5);
      });

      it('prefetches 5 messages in order', function(done) {
        var i = 0;
        setTimeout(function checkFetched() {
          assert.equal(i, 5);
          done();
        }, 50);
        this.queue.handle(this.name, function handler(msg, acknowledge) {
          i++;
          assert.equal(msg.remaining, 10 - i);
          if (i > 5) throw new Error('Prefetched more than 5');
        });
      });
    });
  });
});
