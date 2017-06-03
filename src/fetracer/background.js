var $connections = {};

var $tabUrls = {};

var $ruleTable = {};

chrome.storage.sync.get('rule', function (items) {
    try {
        var _rule = Object.parse(items.rule);
        $ruleTable = _rule;
    } catch (e) {
        console.log('invalid rule stored');
    }
});

var $msgHistory = {};

const $redirectTypeFilter = {
    image: true,
    stylesheet: true,
    script: true,
    xmlhttprequest: true
};

var $redirectWhiteList = {};

const $redirectServerHost = 'https://127.0.0.1:4004';

const copy = function (obj, props) {
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

const escapeRegExp = function (str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
};

const matchPattern = function (url, pat) {
    pat = pat.split('*').map(escapeRegExp).join('(.*)');
    var reg = new RegExp(pat, 'g');
    return reg.test(url);
};

if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function (search, replacement) {
        var target = this;
        return target.split(search).join(replacement);
    };
}

const patternTrans = function (url, matchPat, replacePat) {
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

const isPattern = function (p) {
    if (typeof p !== 'string') return false;
    return p.indexOf('${') >= 0 || p.indexOf('.') > 0;
};

const sendMsg2Panel = function (tid, type, data) {
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
    if (tid in $connections) {
        if ($msgHistory[tid] && $msgHistory[tid].length) {
            $msgHistory[tid].forEach(m => {
                $connections[tid].postMessage(m);
            });
            delete $msgHistory[tid];
        }
        $connections[tid].postMessage(msg);
    } else {
        if (!$msgHistory[tid]) $msgHistory[tid] = [];
        $msgHistory[tid].push(msg);
    }
};

chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
    var activeTab = tabs[0];
    //TODO
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.url) {
        $tabUrls[tabId] = changeInfo.url;
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
                $connections[message.tabId] = port;
                return;
            }
        }
    };

    // Listen to messages sent from the DevTools page
    port.onMessage.addListener(extensionListener);

    port.onDisconnect.addListener(function (port) {
        port.onMessage.removeListener(extensionListener);

        var tabs = Object.keys($connections);
        for (var i = 0, len = tabs.length; i < len; i++) {
            if ($connections[tabs[i]] === port) {
                delete $connections[tabs[i]];
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
        $ruleTable = request.content;
        sendResponse();
    }

    return true;
});

/* Request hijacking */

// cancel or redirect
chrome.webRequest.onBeforeRequest.addListener(function (details) {
    if (!$redirectTypeFilter[details.type]) return;

    for (var tup in $ruleTable) {
        if (!matchPattern($tabUrls[details.tabId], tup)) continue;

        sendMsg2Panel(details.tabId, 'requestComes', copy(details, ['url', 'type']));

        var resourceUrlPats = $ruleTable[tup];

        var typeOfResourceUrlPats = Object.type(resourceUrlPats);

        if (typeOfResourceUrlPats === 'object') {
            var oUrl = details.url;
            var pats = [];

            for (var rup in resourceUrlPats) {
                if (matchPattern(details.url, rup) && details.url.indexOf($redirectServerHost) !== 0) {
                    var p = resourceUrlPats[rup];

                    if (Object.type(p) === 'object' && typeof p.redirect === 'string') { // p is an object and has 'redirect' property
                        var ru = patternTrans(oUrl, rup, p.redirect);
                        sendMsg2Panel(details.tabId, 'requestRedirects', `${oUrl} => ${ru}`);
                        return { redirectUrl: ru };
                    } else if (Object.type(p) === 'array') { // p is a complex array
                        var hasReplacePat = isPattern(p[0]); // p[0] is a pattern
                        if (hasReplacePat) {
                            var ru = patternTrans(oUrl, rup, p[0]);
                            if (isPattern(pats[0])) pats[0] = ru;
                            else pats.unshift(ru);
                            pats = pats.concat(p.slice(1));
                        } else {
                            pats = pats.concat(p);
                        }
                    } else if (typeof p === 'string') {
                        if (isPattern(p)) { // p is a pattern
                            var ru = patternTrans(oUrl, rup, p);
                            if (isPattern(pats[0])) pats[0] = ru;
                            else pats.unshift(ru);
                        } else { // p is a mode
                            pats.push(p);
                        }
                    } else if (p === true) { // p is 'true'
                        pats.push('normal');
                    }
                }
            }

            if (pats.length) {
                sendMsg2Panel(details.tabId, 'requestMatches', oUrl);

                var hasReplacePat = isPattern(pats[0]);
                var nUrl = $redirectServerHost + '/get' + Object.toQueryString({
                    src: hasReplacePat ? pats[0] : oUrl,
                    type: details.type,
                    mode: (hasReplacePat ? pats.slice(1) : pats).join(',')
                });

                return { redirectUrl: nUrl };
            }
        }

        if (typeOfResourceUrlPats === 'array') {
            for (let rup of resourceUrlPats) {
                if (matchPattern(details.url, rup) && details.url.indexOf($redirectServerHost) !== 0) {
                    var oUrl = details.url;
                    sendMsg2Panel(details.tabId, 'requestMatches', oUrl);

                    var nUrl = $redirectServerHost + '/get' + Object.toQueryString({
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
}, { urls: ['http://*/*', 'https://*/*'] }, [
    'blocking' // or 'requestBody'
]);

const setHeaders = function (headerArr, headerObj) {
    var re = [];
    for (let i of headerArr) {
        if (!headerObj.hasOwnProperty(i.name)) {
            re.push(i);
        } else if (headerObj.hasOwnProperty(i.name) && headerObj[i.name] !== undefined) {
            re.push({
                name: i.name,
                value: headerObj[i.name]
            });
        }
    }
    return re;
};

// modify request headers
chrome.webRequest.onBeforeSendHeaders.addListener(function (details) {
    if (!$redirectTypeFilter[details.type]) return;

    for (var tup in $ruleTable) {
        if (!matchPattern($tabUrls[details.tabId], tup)) continue;

        var resourceUrlPats = $ruleTable[tup];

        if (Object.type(resourceUrlPats) === 'object') {
            for (var rup in resourceUrlPats) {
                if (matchPattern(details.url, rup) && details.url.indexOf($redirectServerHost) !== 0) {
                    var oUrl = details.url;

                    var p = resourceUrlPats[rup];
                    if (Object.type(p) === 'object') {
                        if (details.type === 'xmlhttprequest' && p.request) {
                            //TODO
                            sendMsg2Panel(details.tabId, 'requestMatches (req-header)', oUrl);
                            if (p.request.headers) {
                                return { requestHeaders: setHeaders(details.requestHeaders, p.request.headers) };
                            }
                        }
                    }
                    break;
                }
            }
        }

        break;
    }
}, { urls: ['http://*/*', 'https://*/*'] }, ['requestHeaders']);

// modify response headers
chrome.webRequest.onHeadersReceived.addListener(function (details) {
    if (!$redirectTypeFilter[details.type]) return;

    for (var tup in $ruleTable) {
        if (!matchPattern($tabUrls[details.tabId], tup)) continue;

        var resourceUrlPats = $ruleTable[tup];

        if (Object.type(resourceUrlPats) === 'object') {
            for (var rup in resourceUrlPats) {
                if (matchPattern(details.url, rup) && details.url.indexOf($redirectServerHost) !== 0) {
                    var oUrl = details.url;

                    var p = resourceUrlPats[rup];
                    if (Object.type(p) === 'object') {
                        if (details.type === 'xmlhttprequest' && p.response) {
                            //TODO
                            sendMsg2Panel(details.tabId, 'requestMatches (res-header)', oUrl);
                            if (p.response.headers) {
                                return { responseHeaders: setHeaders(details.responseHeaders, p.response.headers) };
                            }
                        }
                    }
                    break;
                }
            }
        }

        break;
    }
}, { urls: ['http://*/*', 'https://*/*'] }, ['responseHeaders']);
