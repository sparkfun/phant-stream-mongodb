var mongoose = require('mongoose'),
    uuid = require('node-uuid'),
    Schema = mongoose.Schema;

module.exports = function(collection, cap) {

  try {

    if (mongoose.model(collection)) {
      return mongoose.model(collection);
    }

  } catch(e) {

    if (e.name === 'MissingSchemaError') {

      // mongoose options
      var options = {
        strict: false,
        versionKey: false
      };

      // default schema
      var definition = {
        _id: { type: String, default: uuid.v1 },
        timestamp: { type: Date, default: Date.now, required: true }
      };

      if(cap) {
        options.capped = cap;
      }

      var schema = new Schema(definition, options);

      return mongoose.model(collection, schema);

   }

  }

};

