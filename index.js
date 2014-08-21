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
    mongoose = require('mongoose'),
    Storage = require('./lib/model'),
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
app.mongoose = false;
app.url = 'mongodb://localhost/test';

/**
 * connect
 *
 * connects to mongo using the mongo url
 */
app.connect = function() {

  // return if already connected
  if(this.mongoose && this.mongoose.connection.readyState) {
    return;
  }

  // connect to mongo
  mongoose.connect(this.url, {server: {auto_reconnect: true}});

  // log errors
  mongoose.connection.on('error', function(err) {
    this.emit('error', err);
  }.bind(this));

  // log connection status
  mongoose.connection.once('open', function() {
    this.emit('info', 'Connected to MongoDB');
  }.bind(this));

  this.mongoose = mongoose;

};

app.readStream = function(id, page) {

  var model = Storage(id, this.cap),
      readable,
      query,
      all = false;

  if(! page || page < 0) {
    all = true;
    page = 1;
  }

  // reverse sort
  query = model.find().sort({'$natural': -1});

  if(! all) {
    query.skip((page - 1) * this.pageSize).limit(this.pageSize);
  }

  readable = query.stream({
    transform: function(doc) {
      return doc.toObject();
    }
  });

  process.nextTick(function() {
    readable.emit('open');
  });

  return readable;

};

app.objectReadStream = app.readStream;

app.writeStream = function(id) {

  return new Writable(id, {
    storage: Storage(id, this.cap)
  });

};

app.write = function(id, data) {

  this.writeStream(id).end(data);

};

app.clear = function(id) {

  if(!(id in this.mongoose.connection.collections)) {
    return;
  }

  this.mongoose.connection.collections[id].drop(function(err) {
    if(err) {
      return this.emit('error', err);
    }
  }.bind(this));

};

app.stats = function(id, callback) {

  if(!(id in this.mongoose.connection.collections)) {
    return callback(null, {
      cap: this.cap,
      used: 0,
      pageCount: 0,
      remaining: this.cap
    });
  }

  this.mongoose.connection.collections[id].stats(function(err, s) {

    if(err) {
      return callback(err);
    }

    var stats = {
      cap: this.cap,
      used: s.size,
      pageCount: Math.ceil(s.count / this.pageSize)
    };

    stats.remaining = stats.cap - stats.used;

    if(stats.remaining < 0) {
      stats.remaining = 0;
    }

    callback(null, stats);

  }.bind(this));

};
