var connections = {};

var tabUrls = {};

var urlRuleTable = {};

var msgHistory = {};

var redirectTypeFilter = {
    // stylesheet: true,
    script: true
};

var urlWhiteList = {};

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
    var reg = new RegExp(pat);
    return reg.test(url);
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
    var tabUrlPats = Object.keys(urlRuleTable);
    for (let tup of tabUrlPats) {
        if (matchPattern(tabUrls[details.tabId], tup)) {
            var resourceUrlPats = urlRuleTable[tup];
            if (resourceUrlPats.length === undefined) {
                resourceUrlPats = Object.keys(resourceUrlPats);
            }
            for (let rup of resourceUrlPats) {
                if (redirectTypeFilter[details.type] && matchPattern(details.url, rup)
                    && details.url.indexOf(redirectServerHost) !== 0) {
                        
                    var oUrl = details.url;
                    sendMsg2Panel(details.tabId, 'requestMatches', oUrl);

                    var nUrl = redirectServerHost + '/get/' + encodeURIComponent(oUrl);
                    return { redirectUrl: nUrl };
                }
            }
            break;
        }
    }
}, {urls: ['http://*/*', 'https://*/*']}, ['blocking']);
