!(function($, io, ko, bootbox) {
  
  /*client side class here..*/
  var Client = function(ko, io) {
    this.__ko = ko;
    this.__io = io;
    this._cards = this.__ko.observableArray([0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100, "Coffee"]);
    this._people = this.__ko.observableArray([]);
  };

  Client.prototype.init = function(name, room) {
    var that = this;
    this._name = this.__ko.observable(name);
    this._room = this.__ko.observable(room);
    this._subj = this.__ko.observable("Task to estimate");
    this._vote = this.__ko.observable(null);
    this.__ko.applyBindings(this);
    this.__socket = this.__io.connect();
    this.__socket.emit('join', this.state());
    this.__socket.on('update', function(data){that.onUpdate.call(that, data)});
    this.__socket.on('leave', function(data){that.onLeave.call(that, data)});
    this.__socket.on('join', function(data){that.onJoin.call(that, data)});
  };
  
  Client.prototype.onUpdate = function(data) {
    this._people.remove(function(el){return el.id == data.id});
    this._people.push(data);
    this._people.sort();
  };

  Client.prototype.onJoin = function(data) {
    this._people.push(data);
    this._people.sort();
    this.update();
  };

  Client.prototype.onLeave = function(data) {
    this._people.remove(function(el){return el.id == data.id});
    this._people.sort();
  };
  
  Client.prototype.update = function(val) {
    this.__socket.emit('update', this.state());
  };
  
  Client.prototype.vote = function(val) {
    this._vote(val);
    this.update();
  };

  Client.prototype.state = function() {
    return {
      'name':this._name(),
      'room':this._room(),
      'subj':this._subj(),
      'vote':this._vote()
    };
  };

  /*'on document load' code below*/
  $(function() {

    var room = window.location.hash.substring(1);
    var name = "Bob"; 
    var client = new Client(ko, io);
    debug = client; /*REMOVE*/ 


    // we first ask for their name
    bootbox.prompt("What is your name?", function(n) {
      if (n) {
        name = n;
        if (!room) {
          bootbox.prompt("Setup a room for Planning Pocker session:", function(r) {
            if (r !== null) {
              room = r;
              window.location.hash = "#" + room;
              client.init(name, room);
            }
          });
        } else { /*has room name*/
          client.init(name, room); /*!DRY*/
        }
      }
    });

  });

})(jQuery, io, ko, bootbox);