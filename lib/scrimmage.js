var http = require("http");
var bf3stats = require("node-bf3stats");
var querystring = require("querystring");
var winston = require("winston");

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
	self.server = null;
}

Scrimmage.prototype.setPlayers = function(players) {
	var self = this;
	self.players = players;
	return self;
};

Scrimmage.prototype.setSignature = function(ident, secretKey) {
	var self = this;
	self.ident = ident;
	self.secretKey = secretKey;
	return self;
};

Scrimmage.prototype.listen = function(port) {
	var self = this;
	self.api = bf3stats.platform(self.platform, self.ident);
	self.port = port;

	console.log("rats");

	showStartupStatus(self);
	self.server = http.createServer(
		function(req, res) {
			if (req.url === "/favicon.ico") {
				res.end();
				return;
			}

			logRequest(req);

			// Routing of non-signed requests.
			if (beginsWith(req.url, "playerlist")) {
				self.playerlist(parameters(req).players, res);
			} else if (beginsWith(req.url, "player")) {
				self.player(parameters(req).player, res);
			} else if (beginsWith(req.url, "dogtags")) {
				self.dogtags(parameters(req).player, res);
			} else if (beginsWith(req.url, "server")) {
				self.server(parameters(req).id, res);
			} else if (beginsWith(req.url, "onlinestats")) {
				self.onlinestats(res)	;
			} else {
				res.end(createError("Unhandled request"));
			}
		}).listen(port);
	return self;
};

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
	var self = this;

	if (players === undefined || players.length === 0) {
		res.end(createError("No players requested"));
	} else {
		self.api.playerlist(players, {}, function(err, list, failed) {
			if (err) {
				res.end(createError(err));
			} else {
				var content = JSON.stringify({
					"list": list,
					"failed": failed
				});
				res.end(content);
			}
		});
	}
};

// TODO Check the incoming parameters

Scrimmage.prototype.player = function(player, res) {
	var self = this;

	if (player === undefined) {
		res.end(createError("No player requested"));
	} else {
		self.api.player(player, {}, function(err, data) {
			if (err) {
				res.end(createError(err));
			} else {
				var content = JSON.stringify({
					"data": data
				});
				res.end(content);
			}
		});
	}
};

Scrimmage.prototype.dogtags = function(player, res) {
	var self = this;

	if (player === undefined) {
		res.end(createError("No player requested"));
	} else {
		self.api.dogtags(player, function(err, data) {
			if (err) {
				res.end(createError(err));
			} else {
				var content = JSON.stringify({
					"data": data
				});
				res.end(content);
			}
		});
	}
};

Scrimmage.prototype.server = function(id, res) {
	var self = this;

	if (id === undefined) {
		res.end(createError("No server requested"));
	} else {
		self.api.server(id, function(err, data) {
			if (err) {
				res.end(createError(err));
			} else {
				var content = JSON.stringify({
					"data": data
				});
				res.end(content);
			}
		});
	}
};

Scrimmage.prototype.onlinestats = function(res) {
	var self = this;

	self.api.onlinestats(function(err, pc, xbox, ps3) {
		if (err) {
			res.end(createError(err));
		} else {
			var content = JSON.stringify({
				"pc": pc,
				"360": xbox,
				"ps3": ps3
			});
			res.end(content);
		}
	});
};

function logRequest(res) {
	winston.log(res.url);
}

function showStartupStatus(self) {
	winston.log("Scrimmage server started on port", self.port);
	winston.log("Ident:", self.ident);
	winston.log("Platform:", self.platform);
	winston.log("Players:");
	winston.log(JSON.stringify(self.players, null, 2));
}