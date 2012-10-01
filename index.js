//
// BF3Stats API interface, platoon statistics and aggregation services
//
var core = require("./lib/scrimmage");

var players = [];
var servers = [];
var signature = {
	ident: null,
	secretKey: null
};

exports.addPlayer = function(player) {
	players.push(player);
	return this;
}

exports.addServer = function(id) {
	servers.push(id);
	return this;
}

exports.setSignature = function(ident, secretKey) {
	signature.ident = ident;
	signature.secretKey = secretKey;
	return this;
}

exports.listen = function(platform, port) {
	return core.create(platform)
						 .setPlayers(players)
						 .setServers(servers)
						 .setSignature(signature.ident, signature.secretKey)
						 .listen(port);
}
