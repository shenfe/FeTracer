var $ = function (selector) {
    var re = document.querySelectorAll(selector) || [];
    if (selector.split(' ').pop().indexOf('#') >= 0) return re[0];
    return re;
};

var _rule = {};

var saveRule = function () {
    var rule = $('#rule').value;
    try {
        rule = JSON.parse(rule);
        _rule = rule;
        chrome.storage.sync.set({'rule': _rule}, function () {
            //TODO
        });
        sendRuleToBg();
        return true;
    } catch (e) {
        return false;
    }
};

document.addEventListener('DOMContentLoaded', function () {
    chrome.storage.sync.get('rule', function (obj) {
        _rule = obj;
        $('#rule').value = JSON.stringify(_rule);

        sendRuleToBg();
    });
    $('#rule').oninput = saveRule;
});

// Create a connection to the background page
var backgroundPageConnection = chrome.runtime.connect({
    name: 'panel'
});

var _tabUrl;
chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
    var activeTab = tabs[0];
    _tabUrl = activeTab.url;
    sendUrlUpdate();
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (chrome.devtools.inspectedWindow.tabId === tabId && tab.url !== _tabUrl) {
        _tabUrl = tab.url;
        sendUrlUpdate();
    }
});

// Send a message to the background page
backgroundPageConnection.postMessage({
    name: 'init',
    tabId: chrome.devtools.inspectedWindow.tabId
});

backgroundPageConnection.onMessage.addListener(function (message) {
    // Incoming message from the background page
    msg2log(message);
    return true;
});

var msg2log = function (message) {
    var $log = $('#log');
    switch (message.name) {
        case 'requestComes':
        case 'requestMatches':
        case 'tabUrlUpdated':
            $log.value += JSON.stringify(message) + '\n';
            break;
    }
};

var sendRuleToBg = function () {
    backgroundPageConnection.postMessage({
        name: 'rule',
        tabId: chrome.devtools.inspectedWindow.tabId,
        content: _rule
    });
};

var sendUrlUpdate = function () {
    backgroundPageConnection.postMessage({
        name: 'tabUrl',
        tabId: chrome.devtools.inspectedWindow.tabId,
        content: _tabUrl
    });

    msg2log({
        name: 'tabUrlUpdated',
        content: _tabUrl
    });
};
