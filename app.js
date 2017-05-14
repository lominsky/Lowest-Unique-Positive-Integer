// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 8000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// LUPI

var users = [];
var gameTime = 30;
var endTime;

function findSocketId(id) {
  for(i in users) {
    if(users[i].id == id)
      return i;
  }
  return null;
}

function startGame() {
  for(i in users) {
    users[i].guess = 0
  }
  var startTime = new Date();
  endTime = startTime.getTime() + 1000 * gameTime;
}

function endGame() {
  var guesses = [];
  for(i in users) {
    if(users[i].guess != 0) {
      guesses.push(users[i]);
    }
  }

  return guesses;
}

var play = function() {
  startGame();
  io.sockets.emit("start", {
    time: gameTime
  });
  setTimeout(function() {
    var result = endGame();
    io.sockets.emit("stop", result);
    play();
  }, gameTime*1000);
}

io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    if (addedUser) return;

    // we store the username in the socket session for this client
    var user = {
      id: socket.id,
      name: username,
      guess: 0
    }
    users.push(user);

    addedUser = true;

    var now = new Date();

    var timeRemaining = Math.floor((endTime - now.getTime())/1000);

    socket.emit('login', {
      numUsers: users.length,
      time: timeRemaining
    });

    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('users', {
      numUsers: users.length
    });

  });

  socket.on('new message', function(message) {
    var index = findSocketId(socket.id);
    if(parseInt(message) > 0) {
      users[index].guess = parseInt(message)
    }
  });


  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      var index = findSocketId(socket.id);
      users.splice(index, i);

      // echo globally that this client has left
      socket.broadcast.emit('users', {
        numUsers: users.length
      });
    }
  });


});

play();