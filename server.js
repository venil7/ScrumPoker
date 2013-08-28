!(function(){

  var static = require('node-static');
  var socket = require('socket.io');
  
  var file = new(static.Server)('./public');

  var server = require('http').createServer(function (request, response) {
      request.addListener('end', function () {
          file.serve(request, response);
      }).resume();
  }).listen(process.env.PORT || 3000);

  var io = socket.listen(server);

  /*this is a Heroku configuration, not required for other envs*/
  if (process.env.HEROKU) {
    io.configure(function () { 
      io.set("transports", ["xhr-polling"]); 
      io.set("polling duration", 10); 
    });
  }

  var Server = function(_und, io) {
    this.__io = io;
  };

  Server.prototype.init = function() {
    var that = this;
    this.__io.sockets.on('connection', function (socket) {
      /*joining room*/
      socket.on('join', function (data) {
        data = that.identify(data, socket);
        var totalInRoom = that.roomMembers(data.room);
        if (totalInRoom < 8) {
          if (totalInRoom != 0) {
            /*notify everyone, but ourselves*/
            that.__io.sockets.in(data.room).emit('join', data);
          }
          socket.join(data.room);
          /*notify ourselves about registering in a room*/
          socket.emit('update', data);
        } else {
          /*too many ppl in room*/
          socket.disconnect();
        }
      });

      /*leaving room*/
      // socket.on('leave', function (data) {
      //   socket.leave(data.room);
      //   /*notify everyone left in the room*/
      //   data = that.identify(data, socket);
      //   var totalInRoom = that.roomMembers(data.room);
      //   if (totalInRoom != 0) {
      //     that.__io.sockets.in(data.room).emit('leave', data);
      //   }
      // });

      /*sending update*/
      socket.on('update', function (data) {
        /*notify everyone*/
        data = that.identify(data, socket);
        that.__io.sockets.in(data.room).emit('update', data);
      });

      /*disconnect, treat as leave*/
      socket.on('disconnect', function () {
        var rooms = that.__io.sockets.manager.roomClients[socket.id];
        for(var room in rooms) {
          if ((room != '') && (rooms[room])) {
            /*removing a slash*/
            room = room.substring(1);
            that.__io.sockets.in(room).emit('leave', { room : room, id : socket.id });
          }
        }
      });

    });
  };

  Server.prototype.roomMembers = function(room) {
    return this.__io.sockets.clients(room).length;
  };

  /*adds identity info to update packet*/
  Server.prototype.identify = function(data, socket) {
    data.id = socket.id;
    return data;
  };

  //start pocker server
  new Server(null, io).init()
  
})();