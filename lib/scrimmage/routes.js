var winston = require("winston");
var _ = require("underscore");
var querystring = require("querystring");
var async = require("async");

function MappedRouter() {
	this.mappings = {};
	this.errorHandler = null;
	this.api = null;
}

MappedRouter.prototype.map = function(pattern, logged, callback) {
	var self = this;

	self.mappings[pattern] = {
		"regex": new RegExp(pattern),
		"callback": callback,
		"logged": logged
	};
	return self;
};

MappedRouter.prototype.setErrorHandler = function(handler) {
	this.errorHandler = handler;
	return this;
};

MappedRouter.prototype.setApi = function(api) {
	this.api = api;
	return this;
};

MappedRouter.prototype.requestListener = function(request, response) {
	var self = this;
	var handled = false;

	_.any(self.mappings, function(mapping, pattern) {
		if (mapping["regex"].exec(request.url)) {
			if (mapping["logged"]) {
				winston.info("[" + pattern + "] " + request.url);
			}
			mapping["callback"].apply(self.api, [parameters(request), response]);
			handled = true;
			return true;
		} else {
			return false;
		}
	});

	if (!handled) {
		if (self.errorHandler) {
			self.errorHandler(request, response);
		} else {
			response.end("404 - " + request.url);	
		}
	}
};

function logRequest(res) {
}

function beginsWith(url, action) {
	var pos = url.indexOf("?");
	if (pos < 0) {
		pos = url.length;
	}

	// Start at position 1 to remove leading "/"
	return url.substring(1, pos) === action;
}

function parameters(req) {
	var pos = req.url.indexOf("?");

	if (pos < 0) {
		return {};
	} else {
		var query = req.url.substring(pos + 1, req.url.length);
		return querystring.parse(query);
	}
}

var api = [
	"map",
	"setErrorListener",
	"setApi",
	"requestListener"
];

var router = exports;
var routes = new MappedRouter();

_.each(api, function(method) {
  router[method] = function () {
    return routes[method].apply(routes, arguments);
  };
});
