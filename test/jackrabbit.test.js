var assert = require('chai').assert;
var jackrabbit = require('../lib/jackrabbit');

describe('jackrabbit', function(){

  describe('constructor', function() {
    describe('with a valid server url', function() {
      it('emits a "connected" event', function(done) {
        this.r = jackrabbit(process.env.RABBIT_URL);
        this.r.once('connected', done);
      });
      it('references a Connection object', function() {
        var c = this.r.getInternals().connection;
        assert.ok(c.connection.stream.writable);
      });
    });
    describe('without a server url', function() {
      it('throws a "url required" error', function() {
        assert.throws(jackrabbit, 'url required');
      });
    });
    // describe('with an invalid url', function() {
    //   it('emits an "error" event', function(done) {
    //     jackrabbit('amqp://1.2')
    //       .once('error', function(err) {
    //         assert.ok(err);
    //         done();
    //       });
    //   });
    // });
  });

  describe('#default', function() {
    describe('without a "name" argument', function() {
      before(function() {
        var r = jackrabbit(process.env.RABBIT_URL);
        this.e = r.default();
      });
      it('returns a direct, nameless exchange', function() {
        assert.ok(this.e.queue);
        assert.ok(this.e.publish);
        assert.equal(this.e.type, 'direct');
        assert.equal(this.e.name, '');
      });
    });
    describe('with a "name" argument', function() {
      before(function() {
        var r = jackrabbit(process.env.RABBIT_URL);
        this.e = r.default('foobar');
      });
      it('returns a direct, nameless exchange', function() {
        assert.ok(this.e.queue);
        assert.ok(this.e.publish);
        assert.equal(this.e.type, 'direct');
        assert.equal(this.e.name, '');
      });
    });
    describe('before connection is established', function() {
      it('passes the connection to the exchange', function(done) {
        jackrabbit(process.env.RABBIT_URL)
          .default()
          .once('connected', done);
      })
    });
    describe('after connection is established', function() {
      before(function(done) {
        this.r = jackrabbit(process.env.RABBIT_URL);
        this.r.once('connected', done);
      });
      it('passes the connection to the exchange', function(done) {
        this.r
          .default()
          .once('connected', done);
      });
    });
  });

  describe('#direct', function() {
    describe('without a "name" argument', function() {
      before(function() {
        var r = jackrabbit(process.env.RABBIT_URL);
        this.e = r.direct();
      });
      it('returns the direct exchange named "amq.direct"', function() {
        assert.ok(this.e.queue);
        assert.ok(this.e.publish);
        assert.equal(this.e.type, 'direct');
        assert.equal(this.e.name, 'amq.direct');
      });
    });
    describe('with a "name" argument of "foobar.direct"', function() {
      before(function() {
        var r = jackrabbit(process.env.RABBIT_URL);
        this.e = r.direct('foobar.direct');
      });
      it('returns a direct exchange named "foobar.direct"', function() {
        assert.ok(this.e.queue);
        assert.ok(this.e.publish);
        assert.equal(this.e.type, 'direct');
        assert.equal(this.e.name, 'foobar.direct');
      });
    });
    describe('before connection is established', function() {
      it('passes the connection to the exchange', function(done) {
        jackrabbit(process.env.RABBIT_URL)
          .direct()
          .once('connected', done);
      })
    });
    describe('after connection is established', function() {
      before(function(done) {
        this.r = jackrabbit(process.env.RABBIT_URL);
        this.r.once('connected', done);
      });
      it('passes the connection to the exchange', function(done) {
        this.r
          .direct()
          .once('connected', done);
      });
    });
  });

  describe('#fanout', function() {
    describe('without a "name" argument', function() {
      before(function() {
        var r = jackrabbit(process.env.RABBIT_URL);
        this.e = r.fanout();
      });
      it('returns the direct exchange named "amq.fanout"', function() {
        assert.ok(this.e.queue);
        assert.ok(this.e.publish);
        assert.equal(this.e.type, 'fanout');
        assert.equal(this.e.name, 'amq.fanout');
      });
    });
    describe('with a "name" argument of "foobar.fanout"', function() {
      before(function() {
        var r = jackrabbit(process.env.RABBIT_URL);
        this.e = r.fanout('foobar.fanout');
      });
      it('returns a direct exchange named "foobar.fanout"', function() {
        assert.ok(this.e.queue);
        assert.ok(this.e.publish);
        assert.equal(this.e.type, 'fanout');
        assert.equal(this.e.name, 'foobar.fanout');
      });
    });
    describe('before connection is established', function() {
      it('passes the connection to the exchange', function(done) {
        jackrabbit(process.env.RABBIT_URL)
          .fanout()
          .once('connected', done);
      })
    });
    describe('after connection is established', function() {
      before(function(done) {
        this.r = jackrabbit(process.env.RABBIT_URL);
        this.r.once('connected', done);
      });
      it('passes the connection to the exchange', function(done) {
        this.r
          .fanout()
          .once('connected', done);
      });
    });
  });

  describe('#close', function() {
    before(function(done) {
      this.r = jackrabbit(process.env.RABBIT_URL);
      this.r.once('connected', done);
    });
    it('emits a "close" event', function(done) {
      this.r.close();
      this.r.once('close', done);
    });
    it('clears the connection', function() {
      assert.ok(!this.r.getInternals().connection);
    });
  });
});
