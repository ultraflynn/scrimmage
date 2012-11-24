var http = require("http");
var bf3stats = require("node-bf3stats");
var async = require("async");
var _ = require("underscore");
var routes = require("./routes");
var winston = require("winston");

exports.create = function(platform) {
	var instance = new Scrimmage(platform);
	instance.configureRoutes();
	return instance;
};

function Scrimmage(platform) {
	var self = this;
	self.platform = platform;
	self.api = null;
	self.ident = null;
	self.secretKey = null;
	self.players = [];
	self.servers = [];
	self.httpInstance = null;
}

Scrimmage.prototype.configureRoutes = function() {
	var self = this;
	routes.map("/favicon.ico", false, self.devNull)
	.map("/playerupdate\\?*", true, self.playerupdate)
	.map("/playerlist\\?*", true, self.playerlist)
	.map("/playerlookup\\?*", true, self.playerlookup)
	.map("/player\\?*", true, self.player)
	.map("/dogtags\\?*", true, self.dogtags)
	.map("/server\\?*", true, self.server)
	.map("/onlinestats\\?*", true, self.onlinestats)
	.map("/setupkey\\?*", true, self.setupkey)
	.map("/getkey\\?*", true, self.getkey)
	.setApi(self)
	.setErrorHandler(function(args, res) {
		throwError(res, "unhandled request");
	});
};

Scrimmage.prototype.setPlayers = function(players) {
	var self = this;
	self.players = players;
	return self;
};

Scrimmage.prototype.setServers = function(servers) {
	var self = this;
	self.servers = servers;
	return self;
}

Scrimmage.prototype.setSignature = function(ident, secretKey) {
	var self = this;
	self.ident = ident;
	self.secretKey = secretKey;
	return self;
};

Scrimmage.prototype.listen = function(port) {
	var self = this;
	self.port = port;
	self.api = bf3stats.setPlatform(self.platform)
		  							 .setIdent(self.ident);
	async.waterfall([
		function(callback) {
			callback(null, self);
		},
		showStartupStatus,
		primePlayerlistsCache,
		primePlayersCache,
		primeDogtagsCache,
		primeServerCache,
		startServer
	]);
	return self;
};

var showStartupStatus = function(self, callback) {
	winston.info("Scrimmage server started on port", self.port);
	winston.info("Ident:", self.ident);
	winston.info("Secret Key:", self.secretKey ? "<given>" : "<missing>");
	winston.info("Platform:", self.platform);
	winston.info("Players:");
	winston.info(JSON.stringify(self.players, null, 2));
	winston.info("Servers:");
	winston.info(JSON.stringify(self.servers, null, 2));
	callback(null, self);
}

var primePlayerlistsCache = function(self, callback) {
	winston.info("[CACHING] playerlist", self.players);
	self.api.playerlist(self.players, {});
	callback(null, self);
}

var primePlayersCache = function(self, callback) {
	_.each(self.players, function(player) {
		winston.info("[CACHING] player", player);
		self.api.player(player, {});
	});
	callback(null, self);
}

var primeDogtagsCache = function(self, callback) {
	_.each(self.players, function(player) {
		winston.info("[CACHING] dogtags", player);
		self.api.dogtags(player);
	});
	callback(null, self);
}

var primeServerCache = function(self, callback) {
	_.each(self.servers, function(server) {
		winston.info("[CACHING] server", server);
		self.api.server(server);
	});
	callback(null, self);
}

var startServer = function(self, callback) {
	this.httpInstance = http.createServer(routes.requestListener).listen(self.port);
	callback(null);
};

Scrimmage.prototype.devNull = function(params, res) {
	res.end();
};

Scrimmage.prototype.playerlist = function(params, res) {
	if (params.players === undefined ||
		  params.players.length === 0) {
		throwError(res, "No players requested");
	} else {
		this.api.playerlist(params.players, {}, handleResult(res));
	}
};

Scrimmage.prototype.player = function(params, res) {
	if (params.player === undefined) {
		throwError(res, "No player requested");
	} else {
		this.api.player(params.player, {}, handleResult(res));
	}
};

Scrimmage.prototype.dogtags = function(params, res) {
	if (params.player === undefined) {
		throwError(res, "No player requested");
	} else {
		this.api.dogtags(params.player, handleResult(res));
	}
};

Scrimmage.prototype.server = function(params, res) {
	if (params.id === undefined) {
		throwError(res, "No server requested");
	} else {
		this.api.server(params.id, handleResult(res));
	}
};

Scrimmage.prototype.onlinestats = function(params, res) {
	this.api.onlinestats(handleResult(res));
};

Scrimmage.prototype.playerupdate = function(params, res) {
	var self = this;
	if (params.player === undefined) {
		throwError(res, "No player requested");
	} else {
		self.api.playerupdate(self.ident, self.secretKey,
			params.player, params.type, handleResult(res));
	}
};

Scrimmage.prototype.playerlookup = function(params, res) {
	if (params.player === undefined) {
		throwError(res, "No player requested");
	} else {
		this.api.playerlookup(params.player, handleResult(res));
	}
};

Scrimmage.prototype.setupkey = function(params, res) {
	if (params.clientident === undefined) {
		throwError(res, "No clientident requested");
	} else {
		this.api.setupkey(params.clientident, params.name, handleResult(res));
	}
};

Scrimmage.prototype.getkey = function(params, res) {
	if (params.clientident === undefined) {
		throwError(res, "No clientident requested");
	} else {
		this.api.getkey(params.clientident, params.name, handleResult(res));
	}
};

var handleResult = function(res) {
	return function(err, data) {
		if (err) {
			throwError(res, err);
		} else {
			var content = JSON.stringify(data);
			res.end(content);
		}
	}
};

function throwError(res, message) {
	res.end(JSON.stringify({
		"error": message
	}));
}
