ExpressJS Extras Package
========================

This package contains extra middleware options for ExpressJS.

Currently it only contains 2, but I will be adding to them as I need them ;)

Installation
------------

`npm install express-extras`

extras.fixIP
------------

This middleware module attempts to normalize `req.socket.remoteAddress` and `headers['x-forwarded-for']` into `req.ip`
when working with a proxy (like nginx).


    var extras = require('express-extras');
    app.configure(function() {

        app.use(extras.fixIP());
        //Or
        app.use(extras.fixIP([
            'x-forwarded-for',
            'forwarded-for',
            'x-cluster-ip'
        ]));

    });


extras.throttle
---------------

Attempts to throttle requests based on the number of times a given resource is accessed.
Once the throttle is reached, a 403 is served to them for the `holdTime` (default 10 seconds)
127.0.0.1 is automatically whitelisted (for development, monit, nagios, etc..)
Probably should be used with/after extras.fixIP so that the users real IP is sent to the throttle.


    var extras = require('express-extras');
    app.configure(function() {

        Use the defaults..
        app.use(extras.throttle());

        //Or supply a config object
        //The default config shown..
        app.use(extras.throttle({
          urlCount: 5,
          urlSec: 1,
          holdTime: 10,
          whitelist: {
              '127.0.0.1': true
          },
          errorCode: 403,
          errorHtml: '<html><title>403 Forbidden</title><body><h1>403 Forbidden</h1><p>Client denied by server configuration.</p></body></html>'
        }));

    });


Build Status
------------

[![Build Status](https://secure.travis-ci.org/davglass/express-extras.png?branch=master)](http://travis-ci.org/davglass/express-extras)


