scrimmage
=========

Statistics and game analysis server for Battlefield 3.

BF3Stats API pass-through
-------------------------
Scrimmage provides pass-through API access for all BF3Stats API calls
that do not require a signed request.

* playerlist
* player
* dogtags
* server
* onlinestats

Signed requests
---------------
When starting Scrimmage you will need to provide a ident and secret
key so that Scrimmage can update statistics about your players. When
calling the BF3Stats API directly (e.g. from PHP) you have to handle
the ident and secret key, making sure that it's posted in an encoded
base64 string. With Scrimmage handling these types of requests you don't
need to do that. Scrimmage will take care of these types of calls.