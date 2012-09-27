//
// BF3Stats API interface, platoon statistics and aggregation services
//
var core = require("./lib/scrimmage");

var players = [];
var signature = {
	ident: null,
	secretKey: null
};

exports.addPlayer = function(player) {
	players.push(player);
	return this;
}

exports.setSignature = function(ident, secretKey) {
	signature.ident = ident;
	signature.secretKey = secretKey;
	return this;
}

exports.listen = function(platform, port) {
	var scrimmage = core.create(platform)
									    .setPlayers(players)
									    .setSignature(signature.ident,
															    	signature.secretKey)
									    .listen(port);
	return scrimmage;
}
