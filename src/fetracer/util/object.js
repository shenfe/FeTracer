/**
 * @Author: Ke Shen <godzilla>
 * @Date:   2017-05-13 01:48:00
 * @Email:  keshen@sohu-inc.com
 * @Last modified by:   godzilla
 * @Last modified time: 2017-05-13 09:13:18
 */


/* base functions */

var evaluate = function (s) {
    return (new Function(s))();
};

var ObjectParse = function (str) {
    if (typeof str !== 'string') return str;

    var obj;
    try {
        obj = evaluate('return ' + str);
    } catch (e) {
        console.error(e);
    }
    return obj;
};

var ObjectStringify = function (obj) {
    var type = Object.prototype.toString.call(obj);

    switch (type) {
        case '[object Object]': {
            var s = '{',
                p = [];

            for (var i in obj) {
                if (!obj.hasOwnProperty(i)) continue;
                if (typeof obj[i] === 'function') {
                    p.push([i, obj[i].toString()]);
                } else {
                    p.push([i, JSON.stringify(obj[i])]);
                }
            }

            s += p.map(v => JSON.stringify(v[0]) + ':' + v[1]).join(',');

            s += '}';
            return s;
        }

        case '[object Array]': {
            return '[' + obj.map(ObjectStringify).join(',') + ']';
        }

        default:
            return JSON.stringify(obj);
    }

    return '';
};

var ObjectCleanClone = function (obj, ifFunctionsRemain) {
    if (!ifFunctionsRemain) return JSON.parse(JSON.stringify(obj));
    return ObjectParse(ObjectStringify(obj));
};

var ObjectFilter = function (obj, propList) {
    var newObj = {};
    propList.forEach(i => {
        if (obj.hasOwnProperty(i)) newObj[i] = obj[i];
    });
    return newObj;
};

var ObjectEntend = function (dest, ...src) {
    var ext = function (d, s) {
        for (var i in s) {
            if (!s.hasOwnProperty(i)) continue;
            d[i] = s[i];
        }
    };
    src.forEach(s => ext(dest, s));
    return dest;
};

var ObjectToQueryString = function (obj) {
    var queries = [];
    for (var i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
        queries.push(i + '=' + encodeURIComponent(obj[i]));
    }
    return queries.length ? ('?' + queries.join('&')) : '';
};

var ObjectFromQueryString = function (str) {
    if (typeof str !== 'string' || str === '' || str === '?') return {};

    if (str.charAt(0) === '?') str = str.substr(1);

    return str.split('&').filter(v => v.indexOf('=') >= 0)
        .map(v => v.split('=').map(decodeURIComponent))
        .filter(v => v.length === 2)
        .reduce((prev, next) => {
            prev[next[0]] = next[1];
            return prev;
        }, {});
};

var TypeOfValue = function (obj) {
    var t = Object.prototype.toString.call(obj);
    return t.substring(8, t.length - 1).toLowerCase();
};

/* extend Object functions */

if (!Object.parse) {
    Object.parse = ObjectParse;
}

if (!Object.stringify) {
    Object.stringify = ObjectStringify;
}

if (!Object.cleanClone) {
    Object.cleanClone = ObjectCleanClone;
}

if (!Object.prototype.cleanClone) {
    Object.prototype.cleanClone = function (ifFunctionsRemain) {
        return ObjectCleanClone(this, ifFunctionsRemain);
    };
}

if (!Object.prototype.filter) {
    Object.prototype.filter = function (filters) {
        if (Object.prototype.toString.call(filters) === '[object Function]') {
            let props = [];
            for (var i in this) {
                if (filters(this[i])) props.push(i);
            }
            filters = props;
        }
        if (Object.prototype.toString.call(filters) !== '[object Array]') {
            filters = Array.prototype.slice.call(arguments, 0);
        }
        return ObjectFilter(this, filters);
    };
}

if (!Object.prototype.extend) {
    Object.prototype.extend = function (...src) {
        return ObjectEntend(this, ...src);
    };
}

if (!Object.toQueryString) {
    Object.toQueryString = ObjectToQueryString;
}

if (!Object.prototype.toQueryString) {
    Object.prototype.toQueryString = function () {
        return ObjectToQueryString(this);
    };
}

if (!Object.fromQueryString) {
    Object.fromQueryString = ObjectFromQueryString;
}

if (!Object.type) {
    Object.type = TypeOfValue;
}

/* export module */

if (typeof module !== 'undefined') {
    module.exports = {
        ObjectParse,
        ObjectStringify,
        ObjectCleanClone,
        ObjectFilter,
        ObjectEntend,
        ObjectToQueryString,
        ObjectFromQueryString,
        TypeOfValue
    };
}
