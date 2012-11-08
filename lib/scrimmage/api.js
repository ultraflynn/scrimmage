var http = require("http");
var bf3stats = require("node-bf3stats");
var querystring = require("querystring");
var async = require("async");
var _ = require("underscore");
var routes = require("./routes");
var winston = require("winston");

// Router Configuration
routes.map("/favicon.ico", false, function(req, res) {
	res.end();
}).map("/player*", true, function(req, res) {
	self.player(args.player, res);
}).map("/dogtags*", true, function(req, res) {
	self.dogtags(args.player, res);
}).map("/server*", true, function(req, res) {
	self.server(args.id, res);
}).map("/onlinestats*", true, function(req, res) {
	self.onlinestats(args.id, res);
}).map("/playerupdate*", true, function(req, res) {
	self.playerupdate(args.player, args.type, res);
}).map("/playerlookup*", true, function(req, res) {
	self.playerlookup(args.player, res);
}).map("/setupkey*", true, function(req, res) {
	self.setupkey(args.clientident, args.name, res);
}).map("/getkey*", true, function(req, res) {
	self.getkey(args.clientident, res);
}).setErrorHandler(function(req, res) {
	throwError(res, "Unhandled request");
});

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
			self.httpInstance = http.createServer(routes.requestListener).listen(port);
			callback(null);
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
		throwError(res, "No players requested");
	} else {
		this.api.playerlist(players, {}, handleResult(res));
	}
};

Scrimmage.prototype.player = function(player, res) {
	if (player === undefined) {
		throwError(res, "No player requested");
	} else {
		this.api.player(player, {}, handleResult(res));
	}
};

Scrimmage.prototype.dogtags = function(player, res) {
	if (player === undefined) {
		throwError(res, "No player requested");
	} else {
		this.api.dogtags(player, handleResult(res));
	}
};

Scrimmage.prototype.server = function(id, res) {
	if (id === undefined) {
		throwError(res, "No server requested");
	} else {
		this.api.server(id, handleResult(res));
	}
};

Scrimmage.prototype.onlinestats = function(res) {
	this.api.onlinestats(handleResult(res));
};

Scrimmage.prototype.playerupdate = function(player, type, res) {
	if (player === undefined) {
		throwError(res, "No player requested");
	} else {
		this.api.playerupdate(player, type, handleResult(res));
	}
};

Scrimmage.prototype.playerlookup = function(player, res) {
	if (player === undefined) {
		throwError(res, "No player requested");
	} else {
		this.api.playerlookup(player, handleResult(res));
	}
};

Scrimmage.prototype.setupkey = function(clientident, name, res) {
	if (clientident === undefined) {
		throwError(res, "No clientident requested");
	} else {
		this.api.setupkey(clientident, name, handleResult(res));
	}
};

Scrimmage.prototype.getkey = function(clientident, res) {
	if (clientident === undefined) {
		throwError(res, "No clientident requested");
	} else {
		this.api.getkey(clientident, name, handleResult(res));
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
