var conf = {
    pullDir: 'resources', // the dir name
    // httpServerPort: 4003,
    httpsServerPort: 4004
};

var express = require('express');
var fs = require('fs');

// var http = require('http');
var https = require('https');
var privateKey  = fs.readFileSync('sslcert/private.pem', 'utf8');
var certificate = fs.readFileSync('sslcert/file.crt', 'utf8');
var credentials = {key: privateKey, cert: certificate};

var app = express();
// var server = http.createServer(app);
// server.listen(conf.httpServerPort);
var sserver = https.createServer(credentials, app);
sserver.listen(conf.httpsServerPort);

var superagent = require('superagent');
var jsBeautify = require('js-beautify').js;

APP_USE: {
    var bodyParser = require('body-parser');
    app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

    // CORS middleware
    var allowCrossDomain = function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
        next();
    };
    app.use(allowCrossDomain);

    app.use(express.static(__dirname));
    app.use(express.static(__dirname + '/' + conf.pullDir));
}

REQ_HANDLE: {
    app.get('/get/:url', function (req, res) {
        var url = decodeURIComponent(req.params.url);
        console.log('get: ' + url);
        superagent.get(url)
            .then(function (pres, err) {
                // res.send(pres.text);

                var filePath = conf.pullDir + '/' + req.params.url;
                fs.writeFileSync(filePath, pres.text);
                res.download(filePath, url.split('/').pop());
            });
    });
}

ENSURE_RESOURCE_DIR: {
    var pathExists = function (path) {
        try {
            fs.accessSync(path, fs.F_OK);
        } catch (e) {
            return false;
        }
        return true;
    };

    var mkDir = function (path) {
        if (!pathExists(path)) fs.mkdirSync(path, 0777);
    };
    mkDir(conf.pullDir);
}
