/**
 * phant-stream-mongodb
 * https://github.com/sparkfun/phant-stream-mongodb
 *
 * Copyright (c) 2014 SparkFun Electronics
 * Licensed under the GPL v3 license.
 */

'use strict';

/**** Module dependencies ****/
var util = require('util'),
    events = require('events'),
    MongoClient = require('mongodb').MongoClient,
    Writable = require('./lib/writable');

/**** Make PhantStream an event emitter ****/
util.inherits(PhantStream, events.EventEmitter);

/**** app prototype ****/
var app = PhantStream.prototype;

/**** Expose PhantStream ****/
exports = module.exports = PhantStream;

function PhantStream(options) {

  if (! (this instanceof PhantStream)) {
    return new PhantStream(options);
  }

  events.EventEmitter.call(this);

  // apply the options
  util._extend(this, options || {});

  this.connect();

}

app.moduleName = 'Stream MongoDB';
app.cap = 50 * 1024 * 1024; // 50mb
app.pageSize = 250; // 250 items per page
app.url = 'mongodb://localhost/test';
app.db = false;

/**
 * connect
 *
 * connects to mongo using the mongo url
 */
app.connect = function() {

  var self = this;

  // return if already connected
  if(this.db) {
    return;
  }

  MongoClient.connect(this.url, function(err, db) {

    if(err) {
      return self.emit('error', err);
    }

    self.db = db;

  });

};

app.readStream = function(id, page) {

  var query,
      all = false;

  if(! this.db) {
    return;
  }

  if(! page || page < 0) {
    all = true;
    page = 1;
  }

  // reverse sort
  query = this.db.collection(id).find({}, {_id:0}).sort({'$natural': -1});

  if(! all) {
    query.skip((page - 1) * this.pageSize).limit(this.pageSize);
  }

  query = query.stream();

  process.nextTick(function() {
    query.emit('open');
  });

  return query;

};

app.objectReadStream = app.readStream;

app.writeStream = function(id) {

  if(!this.db) {
    return false;
  }

  return Writable({
    mongo: this.db,
    id: id,
    cap: this.cap
  });

};

app.write = function(id, data) {

  this.writeStream(id).end(data);

};

app.clear = function(id) {

  var self = this;

  this.db.dropCollection(id, function(err, result) {

    if(err) {
      self.emit('error', err);
    }

  });

};

app.stats = function(id, callback) {

  var self = this;

  this.db.collection(id, {strict:true}, function(err, col) {

    if(err) {
      return callback(null, {
        cap: self.cap,
        used: 0,
        pageCount: 0,
        remaining: self.cap
      });
    }

    col.stats(function(err, s) {

      if(err) {
        return callback(null, {
          cap: self.cap,
          used: 0,
          pageCount: 0,
          remaining: self.cap
        });
      }

      var stats = {
        cap: self.cap,
        used: s.size,
        pageCount: Math.ceil(s.count / self.pageSize)
      };

      stats.remaining = stats.cap - stats.used;

      if(stats.remaining < 0) {
        stats.remaining = 0;
      }

      callback(null, stats);

    });

  });

};
