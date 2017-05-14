// dom
var $$rule;
var $$save;

// data
var $rule;

var saveRule = function () {
    try {
        var rule = Object.parse($$rule.value);
        $rule = rule;
        chrome.storage.sync.set({'rule': $$rule.value}, function () {
            console.log('rule saved: ' + $$rule.value);
        });
        sendRuleToBg();
    } catch (e) {
        console.log('invalid rule input');
    }
};

document.addEventListener('DOMContentLoaded', function () {
    $$rule = document.getElementById('rule');
    $$save = document.getElementById('save');

    chrome.storage.sync.get('rule', function (items) {
        try {
            $rule = Object.parse(items.rule);
        } catch (e) {
            $rule = {};
        }
        console.log('rule', $rule);
        $$rule.value = js_beautify(Object.stringify($rule));
    });

    $$save.addEventListener('click', saveRule, false);
});

var sendRuleToBg = function () {
    chrome.runtime.sendMessage({
        name: 'rule',
        content: $rule
    }, function (response) {
        //TODO
    });
};
