var crypto = require('crypto');
//Dealing with JSON config data, should be good
/*jshint forin: false*/


/**
* This middleware module attempts to normalize req.socket.remoteAddress by adding req.ip
* when working with a proxy (like nginx).
* app.use(extras.fixIP());
* app.use(extras.fixIP([ 'x-forwarded-for', 'forwarded-for', 'x-cluster-ip' ]));
*/
exports.fixIP = function(header) {
    header = header || [ 'x-forwarded-for', 'forwarded-for' ];
    if (!(header instanceof Array)) {
        header = [header];
    }
    return function(req, res, next) {
        if (req && req.socket) {
            var ip = req.socket.remoteAddress;
            header.forEach(function(h) {
                var i, parts;
                for (i in req.headers) {
                    if (i.toLowerCase() === h.toLowerCase()) {
                        parts = req.headers[i].split(',');
                        if (parts[0]) {
                            ip = parts[0].trim();
                        }
                    }
                }
            });
            // express makes req.ip as readonly property
            Object.defineProperty(req, 'ip', {
                value: ip
            });
        }
        next();
    };
};


var hashKey = function(req) {
    return new crypto.Hash('md5').update(req.ip || req.socket.remoteAddress + '::' + req.url + '::' + req.headers['user-agent']).digest('hex');
};

var hashList = {};
var onHold = {};

var rules = {
    urlCount: 5,
    urlSec: 1,
    holdTime: 10,
    whitelist: {
        '127.0.0.1': true
    },
    errorCode: 403,
    errorHtml: '<html><title>403 Forbidden</title><body><h1>403 Forbidden</h1><p>Client denied by server configuration.</p></body></html>'
};

/**
* Attempts to throttle requests based on the number of times a given resource is accessed.
* Once the throttle is reached, a 403 is served to them for the "holdTime" (default 10 seconds)
* 127.0.0.1 is automatically whitelisted (for development, monit, nagios, etc..)
* Probably should be used with/after extras.fixIP so that the users real IP is sent to the throttle.
*
* Use the defaults..
* app.use(extras.throttle());
*
* Or
*
* app.use(extras.throttle({
*   urlCount: 5,
*   urlSec: 1,
*   holdTime: 10,
*   whitelist: {
*       '127.0.0.1': true
*   },
*   errorCode: 403,
*   errorHtml: '<html><title>403 Forbidden</title><body><h1>403 Forbidden</h1><p>Client denied by server configuration.</p></body></html>'
* }));
*/
exports.throttle = function(o) {
    var opts = {}, i;
    o = o || {};
    for (i in rules) {
        opts[i] = rules[i];
    }

    for (i in o) {
        opts[i] = o[i];
    }

    return function(req, res, next) {
        var stamp = parseInt((new Date()).getTime() / 1000, 10),
            key = hashKey(req),
            ip = req.ip || req.socket.remoteAddress;

        if (!hashList[key]) {
            hashList[key] = { count: 0, stamp: stamp };
        }
        hashList[key].count++;

        if (opts.whitelist[ip]) {
            next();
            return;
        }
        if (onHold[key]) {
            if ((stamp - onHold[key]) <= opts.holdTime) {
                res.send(opts.errorHtml, opts.errorCode);
                return;
            } else {
                delete onHold[key];
            }
        }

        if ((stamp - hashList[key].stamp) <= opts.urlSec) {
            if (hashList[key].count >= opts.urlCount) {
                onHold[key] = stamp;
                res.send(opts.errorHtml, opts.errorCode);
                return;
            }
        } else {
            hashList[key].stamp = stamp;
            hashList[key].count = 0;
        }
        setTimeout(function() {
            delete hashList[key];
        }, (opts.urlCount + 1 * 1000));
        next();
    };
};
