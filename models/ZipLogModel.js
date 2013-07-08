
/**
 * @model ZipLogModel
 **/

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

/*
 * @schema
 * @model ZipLogURL
 */
var ZipLogURLSchema = new Schema({
  id                : { 'type' : ObjectId },
  URL               : { 'type' : String, index: true },
  hash              : { 'type' : String, unique: true, index: true },

  hits              : { 'type' : Number, 'default': 0 }, /* the number of total hits */
  uniques           : { 'type' : Number, 'default': 0}, /* the number of unique visitors */
  stats_updated_at  : { 'type' : Date, 'default': null },

  created_at        : { 'type' : Date, 'default': Date.now },
  data              : { 'type'  : Schema.Types.Mixed }
});
var ZipLogURL = mongoose.model('ZipLogURL', ZipLogURLSchema);

/*
 * @schema
 * @model ZipLogArchive
 */
var ZipLogArchiveSchema = new Schema({
  id                : { 'type' : ObjectId },
  hash              : { 'type' : String },

  ip_address        : { 'type' : String },
  user_agent        : { 'type' : String },
  cookie            : { 'type' : String },

  created_at        : { 'type' : Date, 'default': Date.now }
});
var ZipLogArchive = mongoose.model('ZipLogArchive', ZipLogArchiveSchema);


/**
 * @model ZipLogURL
 * @method findByHash
 * @param {String} hash
 * @param {Function} callback
 **/
ZipLogURL.findByHash = function (hash, callback) {
  ZipLogURL.findOne({ hash: hash }, function (error, zipURL) {
    if (error) {
      callback(error, null);
    } else {
      if (zipURL) {
        callback(null, zipURL);
      } else {
        callback(null, null);
      }
    }
  });
};

/**
 * @model ZipLogURL
 * @method updatehitsById
 * @param {ObjectId} id
 * @param {Function} callback
**/
ZipLogURL.updateHitsById = function (URL, options, callback) {
  if (options && options.visitor && URL.visitors.indexOf(options.visitor) === -1) {
    ZipLogURL.update({'hash': options.hash}, {
      $inc: {hits: 1, uniques: 1}, $push: {visitors: options.visitor}}, { multi: true}, function (error) {
      if (error) {
        callback(error, null);
      } else {
        callback(null, URL);
      }
    });
  } else {
    ZipLogURL.update({'hash': options.hash}, { $inc: {hits: 1}}, { multi: true}, function (error) {
      if (error) {
        callback(error, null);
      } else {
        callback(null, URL);
      }
    });
  }
};

/**
 * @model ZipLogArchive
 * @method insert
 * @param {String} hash
 * @param {Mixed} data - map keys: ip_address, user_agent, cookie
 * @param {Function} callback
 */
ZipLogArchive.insert = function (hash, data, callback) {
  var log = new ZipLogArchive({ hash: hash });
  if ( data ) {
    if ( data.ip_address ) {
      log.ip_address = data.ip_address;
    }
    if ( data.user_agent ) {
      log.user_agent = data.user_agent;
    }
    if ( data.cookie ) {
      log.cookie = data.cookie;
    }
  }
  log.save(callback);
};

module.exports.ZipLogURL = ZipLogURL;
module.exports.ZipLogArchive = ZipLogArchive;

/* EOF */
