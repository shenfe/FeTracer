var evaluate = function (s) {
    return (new Function(s))();
};

var ObjectParse = function (str) {
    var obj;
    try {
        obj = evaluate('return ' + str);
    } catch (e) {
        console.error(e);
    }
    return obj;
};

var ObjectStringify = function (obj) {
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

/* extend Object functions */

if (!Object.parse) {
    Object.parse = ObjectParse;
}

if (!Object.stringify) {
    Object.stringify = ObjectStringify;
}

if (!Object.prototype.cleanClone) {
    Object.prototype.cleanClone = function () {
        return ObjectCleanClone(this);
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

/* export module */

if (typeof module !== 'undefined') {
    module.exports = { ObjectParse, ObjectStringify, ObjectFilter, ObjectEntend };
}
