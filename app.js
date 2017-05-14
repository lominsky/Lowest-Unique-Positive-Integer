// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 8000;
var firebase = require("firebase");

firebase.initializeApp({
    apiKey: "AIzaSyDkj3FbA-CFDcv20y2nT9zmZtNJ84r5XjQ",
    authDomain: "lupi-490c9.firebaseapp.com",
    databaseURL: "https://lupi-490c9.firebaseio.com",
    projectId: "lupi-490c9",
    storageBucket: "lupi-490c9.appspot.com",
    messagingSenderId: "155410457297"
  });

var db = firebase.database();

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// LUPI

var users = [];
var gameTime = 30;
var endTime = -1;
var timer;

function findSocketId(id) {
  for(i in users) {
    if(users[i].id == id)
      return i;
  }
  return null;
}

function startGame() {
  for(i in users) {
    users[i].guess = 0;
    users[i].time = "No Guess";
  }
  var startTime = new Date();
  endTime = startTime.getTime() + 1000 * gameTime;
}

function endGame() {
  var guesses = [];
  for(i in users) {
    if(users[i].guess != 0) {
      var temp = {
        name: users[i].name,
        guess: users[i].guess
      }
      guesses.push(temp);
    }
  }

  io.sockets.emit("stop", guesses);

  if(guesses.length > 2) {
    var temp = {
      players: users,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    }
    firebase.database().ref('games').push(temp);
    play();
  } else {
    endTime = -1;
  }
}

var play = function() {
  startGame();
  io.sockets.emit("start", {
    time: gameTime
  });
  timer = setTimeout(function() {
    endGame();
  }, gameTime*1000);
}

io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    if (addedUser) return;


    var now = new Date();

    // we store the username in the socket session for this client
    var user = {
      id: socket.id,
      name: username,
      guess: 0,
      ip: socket.request.connection.remoteAddress,
      time: "No Guess"
    }
    users.push(user);
    addedUser = true;

    if(users.length > 2) {
      play();
    }

    var timeRemaining = -1;
    if(endTime != -1) {
       timeRemaining = Math.floor((endTime - now.getTime())/1000);
    }

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
      users[index].guess = parseInt(message);
      var now = new Date();
      users[index].time = now.getTime();

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

    if(users.length < 3) {
      endGame();
      clearTimeout(timer);
    }
  });


});