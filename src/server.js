var conf = {
    pullDir: 'resources', // the dir name
    cacheDir: 'cache',
    // httpServerPort: 4003,
    httpsServerPort: 4004,
    httpsServerHost: 'https://127.0.0.1'
};

var express = require('express');
var fs = require('fs');
var path = require('path');
var serveIndex = require('serve-index');
var exec = require('child_process').exec;

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
    app.use('/', serveIndex(path.join(__dirname, conf.pullDir)));
    app.use('/', express.static(path.join(__dirname, conf.pullDir)));
}

// Function to download file using wget
var downloadFile = function (file_url, file_name, callback) {
    // compose the wget command
    var wget = 'wget -O ' + conf.cacheDir + '/' + file_name + ' ' + file_url;
    // excute wget using child_process' exec function
    var child = exec(wget, function(err, stdout, stderr) {
        if (err) throw err;
        else callback(conf.pullDir + '/' + file_name, fs.readFileSync(conf.cacheDir + '/' + file_name, 'utf8'));
    });
};

REQ_HANDLE: {
    app.get('/get/:url', function (req, res) {
        var url = decodeURIComponent(req.params.url);
        var urlEncoded = encodeURIComponent(req.params.url);
        console.log('get: ' + url);
        downloadFile(url, urlEncoded, function (filePath, fileContent) {
            fs.writeFileSync(filePath, fileContent);
            res.sendFile(__dirname + '/' + filePath);
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
    mkDir(conf.cacheDir);
}
