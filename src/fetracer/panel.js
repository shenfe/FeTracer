var $ = function (id) {
    return document.getElementById(id);
};

document.addEventListener('DOMContentLoaded', function () {
    //TODO
});

// Create a connection to the background page
var backgroundPageConnection = chrome.runtime.connect({
    name: 'panel'
});

// Send a message to the background page
backgroundPageConnection.postMessage({
    name: 'init',
    tabId: chrome.devtools.inspectedWindow.tabId
});

backgroundPageConnection.onMessage.addListener(function (message) {
    // Incoming message from the background page
    $('log').value += JSON.stringify(message) + '\n';
    return true;
});
