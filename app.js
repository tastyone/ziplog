var url = require('url'),
    express = require('express'),
    crypto = require('crypto');
    ziplog = require('./lib/ziplog');

ziplog.connect("mongodb://localhost/ziplog");

/* set env variables */
var scheme = process.env.SCHEME || "http";
var domain = process.env.DOMAIN || "go.kr";
var port = process.env.PORT || 8080;
var cookie_name = process.env.COOKIE || 'ziplog_key';
var is_production = process.env.PRODUCTION || 0;

var __log = null;
if ( is_production == 1 ) {
  __log = function() {};
} else {
  __log = console.log;
}

/* create express server */
var app = express();
app.use(express.bodyParser());
app.use(express.cookieParser());

var get_user_data = function(req) {
  var data = {};
  if ( req.connection.remoteAddress ) {
    data.ip_address = req.connection.remoteAddress;
  }
  if ( req.headers ) {
    if ( req.headers['user-agent'] ) {
      data.user_agent = req.headers['user-agent'];
    }
    if ( req.cookies[cookie_name] ) {
      data.cookie = req.cookies[cookie_name];
    }
  }
  return data;
};

var set_user_cookie = function(req, res) {
  var user_md5value = req.cookies[cookie_name];
  if ( user_md5value ) return user_md5value;
  var unique_value = req.connection.remoteAddress + '-' + new Date().getTime();
  user_md5value = crypto.createHash('md5').update(unique_value).digest("hex");
  __log('unique_value: ', unique_value, ', user_md5value: ', user_md5value);
  __log('1: ', Date.now());
  __log('2: ', (Date.now()+2592000000));
  __log('3: ', new Date(Date.now()+2592000000));
  __log('4: ', (new Date(Date.now()+2592000000)).getTime());
  res.cookie(cookie_name, user_md5value, { maxAge: 2592000000, httpOnly: true });
  return user_md5value;
};

app.post('/api/zip', function (req, res) {
  __log('req.url, ', req.url);
  __log('req.param.URL, ', req.param('URL'));
  __log('req.headers, ', req.headers);
  __log('req.cookies, ', req.cookies);
  __log('req.connection.remoteAddress, ', req.connection.remoteAddress);

  var URL = req.param('URL');

  var shorten_url = ziplog.generate(URL, function(err, zipURL) {
    if ( err ) {
      var body = err;
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Length', body.length);
      res.end(body);
      return;
    }

    var shorten_url = null;
    if ( port == 80 ) {
      shorten_url = [scheme, '://', domain, '/', zipURL.hash].join('');
    } else {
      shorten_url = [scheme, '://', domain, ':', port, '/', zipURL.hash].join('');
    }
    __log('hash: ', zipURL.hash);
    __log('shorten_url: ', shorten_url);

    var body = shorten_url;
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Length', body.length);
    res.end(body);
  });

});

// app.get('/api/*', function (req, res) {
//   if (req.url === '/favicon.ico') {
//     return;
//   }

//   var removeApi = req.url.slice(5),
//       URL = removeApi,
//       options = {length: 7};

//   short.generate(URL, options, function (error, shortURL) {
//     if (error) {
//       console.error(error);
//     }
//     else {
//       var tinyUrl = [scheme, "://", domain, ":", port, "/", shortURL.hash].join("");
//       __log(["URL is ", shortURL.URL, " ", tinyUrl].join(""));
//       res.end(tinyUrl);
//     }
//   });
// });

app.get('*', function (req, res) {
  if (req.url === '/favicon.ico') {
    return;
  }

  __log('req.url, ', req.url);
  __log('req.headers, ', req.headers);
  __log('req.cookies, ', req.cookies);
  __log('req.connection.remoteAddress, ', req.connection.remoteAddress);
  __log('slice1, ', req.url.slice(1));

  var hash = req.url.slice(1);
  var data = get_user_data(req);
  var user_md5value = set_user_cookie(req, res);
  data.cookie = user_md5value;

  __log('hash: ', hash);
  __log('data: ', data);


  ziplog.retrieve(hash, data, function (err, zipURL) {
    if ( err ) {
      var body = err;
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Length', body.length);
      res.end(body);
      return;
    }

    if ( zipURL && zipURL.URL ) {
      res.redirect(zipURL.URL, 302);
    } else {
      res.send('URL not found!', 404);
      res.end();
    }
  });
});

app.listen(port, function () {
  console.log('Server running on port ' + port);
});
