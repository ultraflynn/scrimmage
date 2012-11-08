//
// BF3Stats API interface, platoon statistics and aggregation services
//
var api = require("./scrimmage/api");

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
	return api.create(platform)
					  .setPlayers(players)
					  .setServers(servers)
					  .setSignature(signature.ident, signature.secretKey)
					  .listen(port);
}
