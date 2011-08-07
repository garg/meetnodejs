var http = require('http');
var sys = require('sys');
var nodeStatic = require('node-static/lib/node-static');
var faye = require('faye');
var url = require('url');

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
  
  self.bayeux = self.createBayeuxServer();
  self.httpServer = self.createHTTPServer();

  self.bayeux.attach(self.httpServer);
  self.httpServer.listen(self.settings.port);
  sys.log('Server started on PORT ' + self.settings.port);
};

LiveStats.prototype.createBayeuxServer = function() {
  var self = this;

  var bayeux = new faye.NodeAdapter({
    mount: '/faye',
	timeout: 45
  });

  return bayeux;
};

LiveStats.prototype.createHTTPServer = function() {
  var self = this;

  var server = http.createServer(function(req, res) {
	var file = new nodeStatic.Server('./public', {
		cache: false
	});

	req.addListener('end', function() {
	  var location = url.parse(req.url, true),
	      params = (location.query || req.headers);

	  if (location.pathname === '/config.json' && req.method === 'GET') {
	    res.writeHead(200, {
		  'Content-Type': 'application/json'
		});
		var jsonString = JSON.stringify({
		  port: self.settings.port
		});
		res.write(jsonString);
		res.end();
	  } else if (location.pathname === '/stat' && req.method === 'GET') {
	    self.ipToPosition(params.ip, function(latitude, longitude, city) {
		  self.bayeux.getClient().publish('/stat', {
		    title: params.title,
			latitude: latitude,
			longitude: longitude,
			city: city,
			ip: params.ip
		  
		   });
		 });
         
		 res.writeHead(200, {
           'Content-Type': 'text/plain'
		 });
		 res.write("OK");
		 res.end();

      } else {
		file.serve(req, res);
      }
	});
	
  });

  return server;
};

LiveStats.prototype.ipToPosition = function(ip, callback){
  var self = this;

  var client = http.createClient(self.settings.geoipServer.port, self.settings.geoipServer.hostname);
  var request = client.request('GET', '/geoip/api/locate.json?ip=' + ip, {'host': self.settings.geoipServer.hostname});
  request.end();

  request.addListener('response', function (response) {
    response.setEncoding('utf-8');

	var body = '';
	response.addListener('data', function (chunk) {
      body += chunk;
	});

	response.addListener('end', function() {
      var json = JSON.parse(body);

	  if (json.latitude && json.longitude) {
        callback(json.latitude, json.longitude, json.city);
	  }
	});
  });
};
module.exports = LiveStats;
