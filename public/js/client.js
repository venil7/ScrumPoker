!(function($, io, ko, bootbox) {
  
  /*client side class here..*/
  var Client = function(ko, io, pubsub) {
    this.__ko = ko;
    this.__io = io;
    this.__pubsub = pubsub /*this will be used as event publisher/subscriber*/
    this._cards = this.__ko.observableArray([0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100, '?']);
    this._people = this.__ko.observableArray([]);
  };

  Client.prototype.init = function(name, room, isNotEmbedded) {
    var that = this;
    
    this._name = this.__ko.observable(name);
    this._room = this.__ko.observable(room);
    this._isNotEmbedded = this.__ko.observable(isNotEmbedded);
    this._subj = this.__ko.observable("");
    this._timer = this.__ko.observable("");
    this.__interval = null;
    this.__lastInterval = null;

    this._subj.subscribe(function(nv){
      var seconds = 0;
      if (that.__lastInterval) {
        window.clearInterval(that.__lastInterval);
      }
      that.__interval = window.setInterval(function() {
        seconds++;
        var mins = Math.floor(seconds / 60);
        var secs = seconds - (mins * 60);
        if (String.prototype.padStart) {
          that._timer(mins.toString().padStart(2, "0") + ":" + secs.toString().padStart(2, "0"));
        }
        else {
          that._timer(mins + ":" + secs);
        }
      }.bind(that), 1000);
      that.__lastInterval = that.__interval;
      that._vote(null);
      that.update.call(that);
    });
    this._vote = this.__ko.observable(null);
    this._vote.subscribe(function(nv){
      if (nv == null) {
        that.__pubsub.trigger('reset');
      }
    });
    this._voteComplete = this.__ko.computed(function() {
      var people = this._people();
      for(var i in people) {
        var person = people[i];
        if (person.vote == null) {
          return false;
        }
      }
      return people.length > 1 ? true : false;
    }, this);
    this._voteComplete.subscribe(function (nv) {
      if (nv) {
        if (that.__lastInterval) {
          window.clearInterval(that.__lastInterval);
        }
        that.__pubsub.trigger('reveal');
      } 
    });

    this.__ko.applyBindings(this);
    
    this.__socket = this.__io.connect();
    this.__socket.on('update', function(data){that.onUpdate.call(that, data);});
    this.__socket.on('leave', function(data){that.onLeave.call(that, data);});
    this.__socket.on('join', function(data){that.onJoin.call(that, data);});
    this.__socket.on('message', function(message){that.__pubsub.trigger('message', message);});

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
    this._people.sort(this.sort);
    this.__pubsub.trigger('update:in', data);

    if (this._subj() != data.subj) {
      this._subj(data.subj);
      this.__pubsub.trigger('subject', data.subj);
    }
  };

  Client.prototype.onJoin = function(data) {
    this._people.push(data);
    this._people.sort(this.sort);
    this._vote(null); /*experimental*/
    this.__pubsub.trigger('join', data);
    this.update();
  };

  Client.prototype.onLeave = function(data) {
    this._people.remove(function(el){return el.id == data.id});
    this._people.sort(this.sort);
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

  Client.prototype.sort = function(left, right) {
    return left.id == right.id ? 0 : (left.id < right.id ? -1 : 1);
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

        var isNotEmbedded = true;
        try {
          var frame = window.frameElement;
          if (frame != null) {
            isNotEmbedded = false;
          }
        }
        catch(e) {
          isNotEmbedded = false;
        }
        isNotEmbedded = false;
        if (!room) {
          bootbox.prompt("Choose a name for poker room", function(r) {
            if (r !== null) {
              room = r;
              window.location.hash = "#" + room;
              client.init(name, room, isNotEmbedded);
            }
          });
        } else { /*has room name*/
          client.init(name, room, isNotEmbedded); /*!DRY*/
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
      $('#average').html('');
      $('#lowest').html('');
      $('#highest').html('');
    });

    client.on('reveal', function(){
      var total = 0;
      var people = 0;
      var lowest = NaN;
      var highest = NaN;
      client._people().forEach(person => {
        if (isNaN(parseInt(person.vote))) {
          return;
        }
        total += person.vote;
        people += 1;
        if (isNaN(lowest) || person.vote < lowest) {
          lowest = person.vote;
        }
        if (isNaN(highest) || person.vote > highest) {
          highest = person.vote;
        }
      });

      $('#average').html(people > 0 ? (total*1.0/people).toFixed(1) : "");
      $('#lowest').html(lowest);
      $('#highest').html(highest);

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