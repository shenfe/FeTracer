// dom
var $log;

document.addEventListener('DOMContentLoaded', function () {
    $log = document.getElementById('log');
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
    msg2log(message);
    return true;
});

var msg2log = function (message) {
    var maxLen;
    switch (message.name) {
        case 'requestComes':
        case 'requestMatches':
        case 'tabUrlUpdated':
        default: {
            $log.value += JSON.stringify(message) + '\n';
            // maxLen = 4096;
            if (maxLen && $log.value.length > maxLen) {
                $log.value = $log.value.substr($log.value.length - maxLen);
            }
            break;
        }
    }
};
