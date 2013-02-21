!(function($, io, ko, bootbox) {
  
  /*client side class here..*/
  var Client = function(ko, io, pubsub) {
    this.__ko = ko;
    this.__io = io;
    this.__pubsub = pubsub /*this will be used as event publisher/subscriber*/
    this._cards = this.__ko.observableArray([0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100, 'C']);
    this._people = this.__ko.observableArray([]);
  };

  Client.prototype.init = function(name, room) {
    var that = this;
    
    this._name = this.__ko.observable(name);
    this._room = this.__ko.observable(room);
    this._subj = this.__ko.observable("Task to estimate");
    this._subj.subscribe(function(){
      that._vote(null);
    });
    this._vote = this.__ko.observable(null);
    this._voteComplete = this.__ko.computed(function() {
      var people = this._people();
      for(var i in people) {
        var person = people[i];
        if (person.vote == null) {
          return false;
        }
      }
      return true;
    }, this);
    this._voteComplete.subscribe(function (nv) {
      if (nv) {
        that.__pubsub.trigger('reveal');
      } 
    });

    this.__ko.applyBindings(this);
    
    this.__socket = this.__io.connect();
    this.__socket.on('update', function(data){that.onUpdate.call(that, data);});
    this.__socket.on('leave', function(data){that.onLeave.call(that, data);});
    this.__socket.on('join', function(data){that.onJoin.call(that, data);});
    this.__socket.on('message', function(message){that.__pubsub.trigger('message', message);});
    this._subj.subscribe(function(newVal) {
      that.update.call(that);
      that.__pubsub.trigger('reset');
    });

    this.__socket.emit('join', this.state());

    this.__pubsub.trigger('init');
    return this;
  };
  
  Client.prototype.on = function(name, delegate) {
    this.__pubsub.on(name, delegate);
  };

  Client.prototype.onUpdate = function(data) {
    this._people.remove(function(el){return el.id == data.id});
    this._people.push(data);
    this._people.sort();
    this.__pubsub.trigger('update:in', data);

    if (this._subj() != data.subj) {
      this._subj(data.subj);
      this.__pubsub.trigger('subject', data.subj);
    }
  };

  Client.prototype.onJoin = function(data) {
    this._people.push(data);
    this._people.sort();
    this.__pubsub.trigger('join', data);
    this.update();
  };

  Client.prototype.onLeave = function(data) {
    this._people.remove(function(el){return el.id == data.id});
    this._people.sort();
    this.__pubsub.trigger('leave', data);
  };
  
  Client.prototype.update = function() {
    var data = this.state();
    this.__socket.emit('update', data);
    this.__pubsub.trigger('update:out', data);
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
    var client = new Client(ko, io, $(window));
    debug = client; /*REMOVE*/ 


    // we first ask for their name
    bootbox.prompt("What is your name?", function(n) {
      if (n) {
        name = n;
        if (!room) {
          bootbox.prompt("Choose a name for poker room", function(r) {
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

    client.on('init', function() {
      $('.card').click(function() {
        $(this).addClass('selected').parent().siblings().find('.card').removeClass('selected');
      });
      $('.alert').hide();
    });

    client.on('reset', function(){
      $('.card').removeClass('selected');
    });

    client.on('reveal', function(){
      $('.flippable').each(function(i, val) {
          setTimeout(function(){
              $(val).addClass('flipped');
          }, i*50);
      });
    });

    client.on('message', function(message){
      bootbox.alert(message);
    });

  });

})(jQuery, io, ko, bootbox);