var vows = require('vows'),
    assert = require('assert'),
    extras = require('../lib/express-extras');

var tests = {
    'exporting': {
        topic: function() {
            return extras
        },
        'should export fixIP method': function(topic) {
            assert.isFunction(topic.fixIP);
        },
        'should export throttle method': function(topic) {
            assert.isFunction(topic.throttle);
        }
    },
    'throttle tests': {
        topic: function() {
            return extras.throttle;
        },
        'should return a function with no arguments': function(topic) {
            assert.isFunction(topic());
        },
        'should return a function with Object': function(topic) {
            assert.isFunction(topic({
                foo: true
            }));
        },
        'should throttle': function(topic) {
            var fn = topic();
            var req = {
                ip: '10.0.0.1'
            };
            var responded = false;
            var res = {
                send: function(html, code) {
                    responded = true;
                    assert.equal(code, 403);
                    assert.equal(html, '<html><title>403 Forbidden</title><body><h1>403 Forbidden</h1><p>Client denied by server configuration.</p></body></html>');
                }
            };
            var noop = function(i) {
                return function() {
                    if (i <= 5) {
                        assert.isFalse(responded);
                    } else {
                        assert.isTrue(responded);
                    }
                };
            };
            for (var i = 1; i < 10; i++) {
                fn(req, res, noop(i));
            }
        },
        'should not throttle whitelist': function(topic) {
            var fn = topic({
                whitelist: {
                    '10.0.0.1': true
                }
            });
            var req = {
                headers: {
                    'user-agent': 'foobar',
                },
                socket: {
                    remoteAddress: '10.0.0.1'
                }
            };
            var res = {
                send: function(html, code) {
                    assert.isTrue(false);
                }
            };
            var noop = function() {};
            for (var i = 1; i < 100; i++) {
                fn(req, res, noop);
            }
        },
    },
    'fixIP tests': {
        topic: function() {
            return extras.fixIP;
        },
        'should return a function with no arguments': function(topic) {
            assert.isFunction(topic());
        },
        'should return a function with a string': function(topic) {
            assert.isFunction(topic('x-forwarded-for'));
        },
        'should return a function with an array ': function(topic) {
            assert.isFunction(topic(['x-forwarded-for']));
        },
        'should return a valid IP from a req object with no headers': function(topic) {
            var req = {
                socket: {
                    remoteAddress: '10.10.10.10'
                }
            };
            assert.isUndefined(req.ip);
            var fn = topic();
            fn(req, {}, function() {
                assert.equal(req.ip, '10.10.10.10');
            });
        },
        'should return a valid IP from a req object with headers': function(topic) {
            var req = {
                headers: {
                    'x-forwarded-for': '5.5.5.5'
                },
                socket: {
                    remoteAddress: '10.10.10.10'
                }
            };
            assert.isUndefined(req.ip);
            var fn = topic();
            fn(req, {}, function() {
                assert.equal(req.ip, '5.5.5.5');
            });
        },
        'should return a valid IP from a req object with multiple proxy headers': function(topic) {
            var req = {
                headers: {
                    'x-forwarded-for': '2.2.2.2, 3.3.3.3, 4.4.4.4, 5.5.5.5'
                },
                socket: {
                    remoteAddress: '10.10.10.10'
                }
            };
            assert.isUndefined(req.ip);
            var fn = topic();
            fn(req, {}, function() {
                assert.equal('2.2.2.2', req.ip);
            });
        },
        'should return a valid IP from a req object with multiple bogus proxy headers': function(topic) {
            var req = {
                headers: {
                    'x-forwarded-for': ', '
                },
                socket: {
                    remoteAddress: '10.10.10.10'
                }
            };
            assert.isUndefined(req.ip);
            var fn = topic();
            fn(req, {}, function() {
                assert.equal('10.10.10.10', req.ip);
            });
        },
        'should not set req.ip if no ip found': function(topic) {
            var req = {
            };
            assert.isUndefined(req.ip);
            var fn = topic();
            fn(req, {}, function() {
                assert.isUndefined(req.ip);
            });
        }
    }
};

vows.describe('express-extras').addBatch(tests).export(module);
