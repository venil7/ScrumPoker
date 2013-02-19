!(function(){

  var static = require('node-static');
  var socket = require('socket.io');
  var _ = require('underscore');
  
  var file = new(static.Server)('./public');

  var server = require('http').createServer(function (request, response) {
      request.addListener('end', function () {
          file.serve(request, response);
      });
  }).listen(process.env.PORT || 3000);

  var io = socket.listen(server);

  var Room = function() {
    this._people = {};
  };

  var Server = function(_und, io) {
    this.__ = _und;
    this.__io = io;
    this.__rooms = {};
  };

  Server.prototype.init = function() {
    var that = this;
    this.__io.sockets.on('connection', function (socket) {
      /*joining room*/
      socket.on('join', function (data) {
        var totalInRoom = that.__io.sockets.clients(data.room).length;
        if (totalInRoom < 8) {
          if (totalInRoom == 0) {
            that.__rooms[data.room] = new Room();
          }
          that.__rooms[data.room]._people[socket.id] = data;
          socket.join(data.room);
        }
      });

      /*leaving room*/
      socket.on('leave', function (data) {
        socket.leave(data.room);
      });

      /*sending vote*/
      socket.on('vote', function (data) {

      });
    });
  };

  //start pocker server
  new Server(_, io).init()
  
})();