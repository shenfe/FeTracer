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
var Prepack = require('prepack');

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

SCRIPT_PARSE: {
    var scriptPipelines = [
        // function (script) {
        //     return Prepack.prepack(script).code;
        // },
        function (script) {
            return jsBeautify(script);
        },
        function (script) {
            return script;
        },
    ];
}

REQ_HANDLE: {
    var downloadFile = function (fileUrl, filePath, callback) {
        var targetFilePath = conf.cacheDir + '/' + filePath;
        ensurePath(targetFilePath.substring(0, targetFilePath.lastIndexOf('/')));
        var wget = "wget -O '" + targetFilePath + "' '" + fileUrl + "'";
        var child = exec(wget, function(err, stdout, stderr) {
            if (err) throw err;
            else callback(filePath);
        });
    };
    var rmFileNameQuery = function (s) {
        var p0 = s.lastIndexOf('.') + 1;
        var p = p0;
        var chatCodes = {
            'a': 'a'.charCodeAt(0),
            'z': 'z'.charCodeAt(0),
            'A': 'A'.charCodeAt(0),
            'Z': 'Z'.charCodeAt(0)
        };
        var len = s.length;
        while (p < len) {
            var c = s.charCodeAt(p);
            if ((chatCodes['a'] <= c && c <= chatCodes['z']) || (chatCodes['A'] <= c && c <= chatCodes['Z'])) {
                p++;
            } else {
                break;
            }
        }
        if (p === p0) p = len;
        return s.substring(0, p);
    };

    app.get('/get', function (req, res) {
        var url = rmFileNameQuery(decodeURIComponent(req.query.src));
        var destPath = url.substr(url.indexOf('//') + 2);
        console.log('get: ' + url);
        downloadFile(url, destPath, function (filePath) {
            var fileFullPath = conf.pullDir + '/' + filePath;
            ensurePath(fileFullPath.substring(0, fileFullPath.lastIndexOf('/')));
            var fileContent = fs.readFileSync(conf.cacheDir + '/' + filePath, 'utf8');
            if (req.query.type === 'script') {
                scriptPipelines.forEach(p => {
                    fileContent = p(fileContent);
                });
            }
            fs.writeFileSync(fileFullPath, fileContent);
            // res.sendFile(__dirname + '/' + fileFullPath);
            res.redirect('/' + filePath);
        });
    });
}

ENSURE_RESOURCE_DIR: {
    var ensurePath = function (filePath) {
        if (!filePath) return;
        if (filePath.charAt(0) === '/') filePath = filePath.substr(1);
        var dirs = filePath.split('/');
        var pre = ['.'];
        for (var i = 0, len = dirs.length; i < len; i++) {
            pre.push(dirs[i]);
            var p = pre.join('/');
            if (!pathExists(p)) fs.mkdirSync(p, 0777);
        }
    };
    var pathExists = function (p) {
        try {
            fs.accessSync(p, fs.F_OK);
        } catch (e) {
            return false;
        }
        return true;
    };
    var mkDir = function (d) {
        if (!pathExists(d)) fs.mkdirSync(d, 0777);
    };
    mkDir(conf.pullDir);
    mkDir(conf.cacheDir);
}
