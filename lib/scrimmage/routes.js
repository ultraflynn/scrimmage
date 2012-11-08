var winston = require("winston");
var _ = require("underscore");

function MappedRouter() {
	this.mappings = [];
	this.errorHandler = null;
}

MappedRouter.prototype.map = function(pattern, logged, callback) {
	var self = this;

	self.mappings.pop({
		"pattern": pattern,
		"callback": callback,
		"logged": logged
	});
	return this;
};

MappedRouter.prototype.setErrorHandler = function(handler) {
	this.errorHandler = handler;
	return this;
};

MappedRouter.prototype.requestListener = function(request, response) {
	logRequest(req);

	// TODO Resolve the lookup in the mappings
};

function logRequest(res) {
	winston.info(res.url);
}

function beginsWith(url, action) {
	var pos = url.indexOf("?");
	if (pos < 0) {
		pos = url.length;
	}

	// Start at position 1 to remove leading "/"
	return url.substring(1, pos) === action;
}

var api = [
	"map",
	"setErrorListener",
	"requestListener"
];

var router = exports;
var routes = new MappedRouter();

_.each(api, function(method) {
  router[method] = function () {
    return routes[method].apply(routes, arguments);
  };
});
