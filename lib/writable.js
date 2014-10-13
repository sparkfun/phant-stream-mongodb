/**
 * phant-stream-csv
 * https://github.com/sparkfun/phant-stream-csv
 *
 * Copyright (c) 2014 SparkFun Electronics
 * Licensed under the GPL v3 license.
 */

'use strict';

/**** Module dependencies ****/
var stream = require('stream'),
    util = require('util');

/**** Make Writable a writable stream ****/
util.inherits(Writable, stream.Writable);

/**** Writable prototype ****/
var app = Writable.prototype;

/**** Expose Writable ****/
exports = module.exports = Writable;

/**** Initialize a new Writable ****/
function Writable(config) {

  if (! (this instanceof Writable)) {
    return new Writable(config);
  }

  stream.Writable.call(this, {
    objectMode: true
  });

  // apply the options
  util._extend(this, config || {});

  this.init();

}

app.id = false;
app.mongo = false;
app.collection = false;
app.cap = false;

app.init = function() {

  var self = this;

  this.mongo.collection(this.id, {strict:true}, function(err, col) {

    var options = {
      capped: false,
      strict: true
    };

    if(self.cap) {
      options.capped = true;
      options.size = self.cap;
    }

    if(err) {
      return self.mongo.createCollection(self.id, options, function(err, col) {
        self.collection = col;
        self.emit('ready');
      });
    }

    self.collection = col;
    self.emit('ready');

  });

};

app._write = function(data, encoding, cb) {

  if(! this.mongo) {
    return cb('not connected to mongodb');
  }

  if(! this.collection) {
    return this.once('ready', function() {
      this._write(data, encoding, cb);
    });
  }

  this.collection.insertOne(data, function(err) {

    if (err) {
      return cb(err);
    }

    cb();

  });

};
