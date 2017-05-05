var connections = {};

var tabUrls = {};

var urlRuleTable = {};

chrome.storage.sync.get('rule', function (items) {
    try {
        var _rule = JSON.parse(items.rule);
        urlRuleTable = _rule;
    } catch (e) {
        console.log('invalid rule stored');
    }
});

var msgHistory = {};

var redirectTypeFilter = {
    // stylesheet: true,
    script: true
};

var redirectWhiteList = {};

var redirectServerHost = 'https://127.0.0.1:4004';

var copy = function (obj, props) {
    var re;
    if (props && props.length) {
        re = {};
        props.forEach(p => {
            re[p] = obj[p];
        });
    } else {
        re = obj;
    }
    return JSON.parse(JSON.stringify(re));
};

var escapeRegExp = function (str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
};

var matchPattern = function (url, pat) {
    pat = pat.split('*').map(escapeRegExp).join('(.*)');
    var reg = new RegExp(pat, 'g');
    return reg.test(url);
};

var objToQueryString = function (obj) {
    var queries = [];
    for (var i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
        queries.push(i + '=' + encodeURIComponent(obj[i]));
    }
    return queries.length ? ('?' + queries.join('&')) : '';
};

if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function (search, replacement) {
        var target = this;
        return target.split(search).join(replacement);
    };
}

var patternTrans = function (url, matchPat, replacePat) {
    matchPat = matchPat.split('*').map(escapeRegExp).join('(.*)');
    var reg = new RegExp(matchPat, 'g');
    var res = reg.exec(url);
    if (res && res[0]) {
        var i = 1;
        while (typeof res[i] === 'string') {
            replacePat = replacePat.replaceAll('${' + i + '}', res[i]);
            i++;
        }
        return replacePat;
    } else return null;
};

var isPattern = function (p) {
    if (typeof p !== 'string') return false;
    return p.indexOf('${') >= 0 || p.indexOf('.') > 0;
};

var sendMsg2Panel = function (tid, type, data) {
    var msg;
    switch (type) {
        case 'contentScriptMsg':
        case 'requestComes':
        case 'requestMatches':
        case 'tabUrlUpdated':
        default:
            msg = {
                name: type,
                content: data
            };
    }
    if (tid in connections) {
        if (msgHistory[tid] && msgHistory[tid].length) {
            msgHistory[tid].forEach(m => {
                connections[tid].postMessage(m);
            });
            delete msgHistory[tid];
        }
        connections[tid].postMessage(msg);
    } else {
        if (!msgHistory[tid]) msgHistory[tid] = [];
        msgHistory[tid].push(msg);
    }
};

chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
    var activeTab = tabs[0];
    //TODO
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.url) {
        tabUrls[tabId] = changeInfo.url;
        sendMsg2Panel(tabId, 'tabUrlUpdated', changeInfo.url);
    }
});

chrome.runtime.onConnect.addListener(function (port) {
    var extensionListener = function (message, sender, sendResponse) {
        console.log('incoming message from the DevTools page');

        // The original connection event doesn't include the tab ID of the
        // DevTools page, so we need to send it explicitly.
        switch (message.name) {
            case 'init': {
                connections[message.tabId] = port;
                return;
            }
        }
    };

    // Listen to messages sent from the DevTools page
    port.onMessage.addListener(extensionListener);

    port.onDisconnect.addListener(function (port) {
        port.onMessage.removeListener(extensionListener);

        var tabs = Object.keys(connections);
        for (var i = 0, len = tabs.length; i < len; i++) {
            if (connections[tabs[i]] === port) {
                delete connections[tabs[i]];
                break;
            }
        }
    });
});

// Receive message
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log('incoming message');

    // Messages from content scripts should have `sender.tab` set
    if (sender.tab) {
        sendMsg2Panel(sender.tab.id, 'contentScriptMsg', request);
    }

    // Communicate with Popup page about the rule
    if (request.name === 'rule') {
        urlRuleTable = request.content;
        sendResponse();
    }

    return true;
});

// Request hijacking
chrome.webRequest.onBeforeRequest.addListener(function (details) {
    sendMsg2Panel(details.tabId, 'requestComes', copy(details, ['url', 'type']));

    if (!redirectTypeFilter[details.type]) return;

    var tabUrlPatterns = Object.keys(urlRuleTable);
    for (let tup of tabUrlPatterns) {
        if (matchPattern(tabUrls[details.tabId], tup)) {
            var resourceUrlPats = urlRuleTable[tup];

            var typeOfResourceUrlPats = Object.prototype.toString.call(resourceUrlPats);

            if (typeOfResourceUrlPats === '[object Object]') {
                var resourceUrlPatKeys = Object.keys(resourceUrlPats);
                for (let rup of resourceUrlPatKeys) {
                    if (matchPattern(details.url, rup) && details.url.indexOf(redirectServerHost) !== 0) {
                        var oUrl = details.url;

                        var p = resourceUrlPats[rup];
                        if (Object.prototype.toString.call(p) === '[object Array]') { // p is a complex array
                            sendMsg2Panel(details.tabId, 'requestMatches (complex)', oUrl);

                            var hasReplacePat = isPattern(p[0]); // p[0] is a pattern

                            var nUrl = redirectServerHost + '/get' + objToQueryString({
                                src: hasReplacePat ? patternTrans(oUrl, rup, p[0]) : oUrl,
                                type: details.type,
                                mode: (hasReplacePat ? p.slice(1) : p).join(',')
                            });

                            return { redirectUrl: nUrl };
                        } else if (typeof p === 'string') {
                            if (isPattern(p)) { // p is a pattern
                                sendMsg2Panel(details.tabId, 'requestMatches (with redirectPattern)', oUrl);
                                return { redirectUrl: patternTrans(oUrl, rup, p) };
                            } else { // p is a mode
                                sendMsg2Panel(details.tabId, 'requestMatches (with mode)', oUrl);

                                var nUrl = redirectServerHost + '/get' + objToQueryString({
                                    src: oUrl,
                                    type: details.type,
                                    mode: p
                                });

                                return { redirectUrl: nUrl };
                            }
                        } else if (p) { // p is anything else but true
                            sendMsg2Panel(details.tabId, 'requestMatches', oUrl);

                            var nUrl = redirectServerHost + '/get' + objToQueryString({
                                src: oUrl,
                                type: details.type,
                                mode: 'normal'
                            });

                            return { redirectUrl: nUrl };
                        }
                    }
                }
            }

            if (typeOfResourceUrlPats === '[object Array]') {
                for (let rup of resourceUrlPats) {
                    if (matchPattern(details.url, rup) && details.url.indexOf(redirectServerHost) !== 0) {
                        var oUrl = details.url;
                        sendMsg2Panel(details.tabId, 'requestMatches', oUrl);

                        var nUrl = redirectServerHost + '/get' + objToQueryString({
                            src: oUrl,
                            type: details.type,
                            mode: 'normal'
                        });

                        return { redirectUrl: nUrl };
                    }
                }
            }

            break;
        }
    }
}, {urls: ['http://*/*', 'https://*/*']}, ['blocking']);
