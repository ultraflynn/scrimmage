var http = require("http");
var bf3stats = require("node-bf3stats");
var querystring = require("querystring");
var winston = require("winston");
var async = require("async");
var _ = require("underscore");

exports.create = function(platform) {
	return new Scrimmage(platform);
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

	async.series([
		function(callback) {
			showStartupStatus(self, callback);
		},
		function(callback) {
			primePlayerlistsCache(self, callback);
		},
		function(callback) {
			primePlayersCache(self, callback);
		},
		function(callback) {
			primeDogtagsCache(self, callback);
		},
		function(callback) {
			primeServerCache(self, callback);
		},
		function(callback) {
			startHttpServer(self, port, callback);
		}
	]);
	return self;
};

function showStartupStatus(self, callback) {
	winston.info("Scrimmage server started on port", self.port);
	winston.info("Ident:", self.ident);
	winston.info("Secret Key:", self.secretKey ? "<given>" : "<missing>");
	winston.info("Platform:", self.platform);
	winston.info("Players:");
	winston.info(JSON.stringify(self.players, null, 2));
	winston.info("Servers:");
	winston.info(JSON.stringify(self.servers, null, 2));
	callback(null);
}

function primePlayerlistsCache(self, callback) {
	winston.info("[CACHING] playerlist", self.players);
	self.api.playerlist(self.players, {});
	callback(null);
}

function primePlayersCache(self, callback) {
	_.each(self.players, function(player) {
		winston.info("[CACHING] player", player);
		self.api.player(player, {});
	});
	callback(null);
}

function primeDogtagsCache(self, callback) {
	_.each(self.players, function(player) {
		winston.info("[CACHING] dogtags", player);
		self.api.dogtags(player);
	});
	callback(null);
}

function primeServerCache(self, callback) {
	_.each(self.servers, function(server) {
		winston.info("[CACHING] server", server);
		self.api.server(server);
	});
	callback(null);
}

function startHttpServer(self, port, callback) {
	self.httpInstance = http.createServer(
		function(req, res) {
			if (req.url === "/favicon.ico") {
				res.end();
				return;
			}

			logRequest(req);

			var args = parameters(req);
			if (beginsWith(req.url, "playerlist")) {
				self.playerlist(args.players, res);
			} else if (beginsWith(req.url, "player")) {
				self.player(args.player, res);
			} else if (beginsWith(req.url, "dogtags")) {
				self.dogtags(args.player, res);
			} else if (beginsWith(req.url, "server")) {
				self.server(args.id, res);
			} else if (beginsWith(req.url, "onlinestats")) {
				self.onlinestats(res);
			} else if (beginsWith(req.url, "playerupdate")) {
				self.playerupdate(args.player, args.type, res);
			} else if (beginsWith(req.url, "playerlookup")) {
				self.playerlookup(args.player, res);
			} else if (beginsWith(req.url, "setupkey")) {
				self.setupkey(args.clientident, args.name, res);
			} else if (beginsWith(req.url, "getkey")) {
				self.getkey(args.clientident, res);
			} else {
				res.end(createError("Unhandled request"));
			}
		}).listen(port);
	callback(null);
}

function createError(message) {
	return JSON.stringify({
		"error": message
	});
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

Scrimmage.prototype.playerlist = function(players, res) {
	if (players === undefined || players.length === 0) {
		res.end(createError("No players requested"));
	} else {
		this.api.playerlist(players, {}, handleResult(res));
	}
};

Scrimmage.prototype.player = function(player, res) {
	if (player === undefined) {
		res.end(createError("No player requested"));
	} else {
		this.api.player(player, {}, handleResult(res));
	}
};

Scrimmage.prototype.dogtags = function(player, res) {
	if (player === undefined) {
		res.end(createError("No player requested"));
	} else {
		this.api.dogtags(player, handleResult(res));
	}
};

Scrimmage.prototype.server = function(id, res) {
	if (id === undefined) {
		res.end(createError("No server requested"));
	} else {
		this.api.server(id, handleResult(res));
	}
};

Scrimmage.prototype.onlinestats = function(res) {
	this.api.onlinestats(handleResult(res));
};

Scrimmage.prototype.playerupdate = function(player, type, res) {
	if (player === undefined) {
		res.end(createError("No player requested"));
	} else {
		this.api.playerupdate(player, type, handleResult(res));
	}
}

Scrimmage.prototype.playerlookup = function(player, res) {
	if (player === undefined) {
		res.end(createError("No player requested"));
	} else {
		this.api.playerlookup(player, handleResult(res));
	}
}

Scrimmage.prototype.setupkey = function(clientident, name, res) {
	if (clientident === undefined) {
		res.end(createError("No clientident requested"));
	} else {
		this.api.setupkey(clientident, name, handleResult(res));
	}
}

Scrimmage.prototype.getkey = function(clientident, res) {
	if (clientident === undefined) {
		res.end(createError("No clientident requested"));
	} else {
		this.api.getkey(clientident, name, handleResult(res));
	}
}

var handleResult = function(res) {
	return function(err, data) {
		if (err) {
			res.end(createError(err));
		} else {
			var content = JSON.stringify(data);
			res.end(content);
		}
	}
}

function logRequest(res) {
	winston.info(res.url);
}
