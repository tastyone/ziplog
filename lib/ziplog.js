
/**
 * @list dependencies
 **/

var mongoose = require('mongoose')
  , ZipLogURL
  , ZipLogArchive;




/**
 * @method hasher
 * @description:
 * @param {String} URL URL to be hashed
 * @returns {String} 6 byte hashed representation of the URL
 **/

var hasher = exports.hasher = function(URL, length) {
  if (!length) length = 6;
  var AUID = [],
      CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  for (var i = 0; i < length; i++) {
    AUID.push(CHARS[Math.floor(Math.random()*62)]);
  }
  return AUID.join('');
};


/**
 * @method connect
 * @param {String} mongdb Mongo DB String to connect to
 **/

var connect = exports.connect = function(mongodb) {
  mongoose.connect(mongodb);
  // expose connection object
  exports.connection = mongoose.connection;
  createModel();
};

/**
 * @public createConnection
 * @description This will create a connection, instead of using the global mongo connection.
 **/

exports.createConnection = function createConnection(MongoURI) {
  var connection = exports.connection = mongoose.createConnection(MongoURI, function(error) {
    if (error) {
      console.log('connection error: ' + require('util').inspect(error));
    }
  });
  // Event when the db is connected
  connection.once('open', function()  {
    console.log('short package opened connection to mongo db: ' + MongoURI);
  });
  createModel();
};

/**
 * @method createModel
 * Connect after a connection has been declared
 * it is OK if not connected yet, mongoose buffers request
 **/

function createModel() {
  var model = require('../models/ZipLogModel');
  ZipLogURL = exports.ZipLogURL = model.ZipLogURL;
  ZipLogArchive = exports.ZipLogArchive = model.ZipLogArchive;
}

/**
 * @method generate
 * @param {String} URL URL to create a Short URL of
 * @param {Mixed} options Options to generate short URL - length, data
 * @param {Functon} callback Callback to execute on completion
 **/

var generate = exports.generate = function(URL, options, callback) {
  var hashedURL
    , customData;
  // options takes an optional object literal
  // right now it only supports an options.length argument
  if (arguments.length === 2  && arguments[1] instanceof Function) {
    callback = arguments[1];
    hashedURL = hasher(URL);
  } else if (arguments.length === 3  && arguments[1] instanceof Object && arguments[2] instanceof Function) {
    hashedURL = (options.length) ? hasher(URL, options.length) : hasher(URL);
    customData = (options.data) ? options.data : null;
  } else {
    throw new Error('generate requires a URL and callback function!');
  };

  console.log('hashedURL: ', hashedURL);
  console.log('customData: ', customData);

  var item = new ZipLogURL({
    URL  : URL,
    hash : hashedURL
  });
  if (customData && typeof customData != 'undefined') {
    item.data = customData;
  };
  item.save(function(error, item) {
    // tries to save to mongodb, if it exists it retries
    if (error && error.code === 11000) {
      if (options) {
        generate(URL, options, callback);
      } else {
        generate(URL, callback);
      };
    } else {
      callback(null, item);
    }
  });
};

/**
 * @method retrieve
 * @param {String} hash Hashed Base 62 URL to retrieve
 * @param {Mixed} options - retrieve log option data: ip_address, user_agent, cookie
 * @param {Functon} callback Callback to execute on completion
 **/

var retrieve = exports.retrieve = function(hash, options, callback) {
  if (arguments.length === 2  && arguments[1] instanceof Function) {
    callback = arguments[1];
    options = {};
  } else if (arguments.length === 3  && arguments[1] instanceof Object && arguments[2] instanceof Function) {
  // options takes an optional object literal
  // right now it only supports an options.visitor argument
  } else {
    throw new Error('retrieve requires a hash and callback function!');
  };
  ZipLogURL.findByHash(hash, function(error, zipURL) {
    if (error) {
      callback(error, null);
    } else if (zipURL) {
      var data = {};
      if ( options.ip_address ) {
        data.ip_address = options.ip_address;
      }
      if ( options.user_agent ) {
        data.user_agent = options.user_agent;
      }
      if ( options.cookie ) {
        data.cookie = options.cookie;
      }

      ZipLogArchive.insert(hash, data, function(err, zipArchive) {
        if ( err ) {
          console.log(err);
        }
      });
      callback(null, zipURL);
    } else {
      callback(null, null);
    }
  });
};

/**
 * @method list
 * @param {Function} callback
 * List all Shortened URLs
 **/

var list = exports.list = function(callback) {
  ZipLogURL.find({}, function(error, zipURLs) {
    if (error) {
      callback(error, null);
    } else {
      callback(null, zipURLs);
    }
  });
};

/* EOF */