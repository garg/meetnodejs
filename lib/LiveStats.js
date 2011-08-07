var http = require('http');
var sys = require('sys');
var nodeStatic = require('node-static/lib/node-static');

function LiveStats(options) {

  if(! (this instanceof arguments.callee)){
    return new arguments.callee(arguments);
  }

  var self = this;

  self.settings = {
    port: options.port,
	geoipServer: {
	  hostname: options.geoipServer.hostname
	  , port: options.geoipServer.port || 80
	}
  };

  self.init();

};

LiveStats.prototype.init = function() {
  var self = this;

  self.httpServer = self.createHTTPServer();
  self.httpServer.listen(self.settings.port);
  sys.log('Server started on PORT ' + self.settings.port);
};

LiveStats.prototype.createHTTPServer = function() {
  var self = this;

  var server = http.createServer(function(req, res) {
	var file = new nodeStatic.Server('./public', {
		cache: false
	});

	req.addListener('end', function() {
	  if (req.url === '/config.json' && req.method === 'GET') {
	    res.writeHead(200, {
		  'Content-Type': 'application/json'
		});
		var jsonString = JSON.stringify({
		  port: self.settings.port
		});
		res.write(jsonString);
		res.end();
      } else {
		file.serve(req, res);
      }
	});
	
  });

  return server;
};

module.exports = LiveStats;
