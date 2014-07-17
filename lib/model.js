var mongoose = require('mongoose'),
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
        versionKey: false,
        toObject: {
          transform: function (doc, ret) {
            delete ret._id;
          }
        }
      };

      // default schema
      var definition = {
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

