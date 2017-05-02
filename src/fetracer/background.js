var connections = {};

var tabUrls = {};

var copy = function (obj) {
    return JSON.parse(JSON.stringify(obj));
};

var _rule = {};

var escapeRegExp = function (str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
};

var matchPattern = function (url, pat) {
    pat = pat.split('*').map(escapeRegExp).join('(.*)');
    var reg = new RegExp(pat);
    return reg.test(url);
};

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
            case 'rule': {
                _rule = message.content;
                return;
            }
            case 'tabUrl': {
                tabUrls[message.tabId] = message.content;
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

// Request hijacking
chrome.webRequest.onBeforeRequest.addListener(function (details) {
    if (details.tabId in connections) {
        connections[details.tabId].postMessage({
            name: 'requestComes',
            content: copy(details)
        });
        var tabUrlPats = Object.keys(_rule);
        for (let tup of tabUrlPats) {
            if (matchPattern(tabUrls[details.tabId], tup)) {
                var resourceUrlPats = _rule[tup];
                if (resourceUrlPats.length === undefined) {
                    resourceUrlPats = Object.keys(resourceUrlPats);
                }
                for (let rup of resourceUrlPats) {
                    if (matchPattern(details.url, rup)) {
                        var oUrl = details.url;
                        connections[details.tabId].postMessage({
                            name: 'requestMatches',
                            content: oUrl
                        });
                        return { redirectUrl: 'http://127.0.0.1:4004/get/' + encodeURIComponent(oUrl) };
                    }
                }
                break;
            }
        }
    }
}, {urls: ["http://*/*", "https://*/*"]});
