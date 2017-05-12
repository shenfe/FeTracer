// dom
var $rule;
var $save;

// data
var _rule;

var saveRule = function () {
    try {
        var rule = Object.parse($rule.value);
        _rule = rule;
        chrome.storage.sync.set({'rule': $rule.value}, function () {
            console.log('rule saved: ' + $rule.value);
        });
        sendRuleToBg();
    } catch (e) {
        console.log('invalid rule input');
    }
};

document.addEventListener('DOMContentLoaded', function () {
    $rule = document.getElementById('rule');
    $save = document.getElementById('save');

    chrome.storage.sync.get('rule', function (items) {
        try {
            _rule = Object.parse(items.rule);
        } catch (e) {
            _rule = {};
        }
        $rule.value = js_beautify(Object.stringify(_rule));
    });

    $save.addEventListener('click', saveRule, false);
});

var sendRuleToBg = function () {
    chrome.runtime.sendMessage({
        name: 'rule',
        content: _rule
    }, function (response) {
        //TODO
    });
};
