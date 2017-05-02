var conf = {
    pullDir: 'resources' // the dir name
};

var express = require('express');
var app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var superagent = require('superagent');

var fs = require('fs');

var jsBeautify = require('js-beautify').js;

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

app.get('/get/:url', function (req, res) {
    var url = decodeURIComponent(req.params.url);
    console.log('get: ' + url);
    superagent.get(url)
        .then(function (pres, err) {
            res.send(pres.text);
        });
});

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

var server = app.listen(4004, function () {
    console.log('Listening on port %d', server.address().port);
});
