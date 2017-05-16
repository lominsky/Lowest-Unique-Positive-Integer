// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 80;
var firebase = require("firebase");

firebase.initializeApp({

});

var db = firebase.database();

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

app.use(express.static(__dirname + '/public'));

var users = [];
var timeLeft = -1;
var interval;

io.on('connection', function (socket) {
  var user = {
    id: socket.id,
    choice: 0,
  }
  users.push(user);
  sendUsers();
  countChoices();

  var log = {
    ip: socket.request.connection.remoteAddress,
    headers: socket.request.headers,
    connect: firebase.database.ServerValue.TIMESTAMP
  }
  firebase.database().ref('users/' + socket.id ).set(log);

  firebase.database().ref('current').set(users);

  socket.on('local ip', function(ip) {
    var index = findSocketIndex(socket.id);
    firebase.database().ref('users/' + users[index].id + '/local_ip').set(ip);
  });

  // when the user disconnects
  socket.on('disconnect', function (socket) {
    checkOpenConnections();
    sendUsers();
    var c = 0;
    for(i in users) {
      if(users[i].choice != 0)
        c++;
    }
    if(c < 3) {
      clearInterval(interval);
      timeLeft = -1;
      io.sockets.emit('not enough players');
    }
    countChoices();
  });

  socket.on('new choice', function (data) {
    var index = findSocketIndex(socket.id);
    var choice = parseInt(data);
    if(choice > 0) {
      users[index].choice = data;
      countChoices();
    }
  });
});

function checkOpenConnections() {
  for(var i = users.length-1; i >= 0; i--) {
    if(io.sockets.sockets[users[i].id] == null) {
      firebase.database().ref('users/' + users[i].id + '/disconnect').set(firebase.database.ServerValue.TIMESTAMP);
      users.splice(i, 1);
      firebase.database().ref('current').set(users);
    }
  }
}

function countChoices() {
  var count = 0;
  for(i in users) {
    if(users[i].choice != 0)
      count++;
  }
  io.sockets.emit('choice count', {
    count: count
  });
  if(count > 2 && timeLeft == -1) {
    startGame();
  }
}

function startGame() {
  timeLeft = 31;
  interval = setInterval(function(){
    io.sockets.emit('time remaining', {
      time: timeLeft-1
    });
    timeLeft--;
    if(timeLeft === 0) {
        clearInterval(interval);
        endGame();
    }
  }, 1000);
}

function endGame() {
  timeLeft = -1;
  var choices = [];
  for(i in users) {
    if(users[i].choice != 0) {
      choices.push(users[i].choice);
    }
  }
  io.sockets.emit('game over', {
    choices: choices
  });
  var game = {
    users: users,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  }
  firebase.database().ref('games').push(game);
  for(i in users) {
    users[i].choice = 0;
  }
  countChoices();
}

function findSocketIndex(id) {
  for(i in users) {
    if(users[i].id == id) {
      return i;
    }
  }
  return null;
}

function sendUsers() {
  io.sockets.emit('user count', {
    count: users.length,
    users: users
  });
}