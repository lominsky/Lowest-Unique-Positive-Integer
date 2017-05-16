$(function() {
  // Initialize variables
  var $window = $(window);
  var $input = $('#input'); // Input message input box
  var $users = $('#users');
  var $choices = $('#choices');

  $('#choose-button').click(function() {
    getChoice();
  });

  // Get IP Address
  getUserIP(function(ip){
      socket.emit('local ip', ip);
  });

  var socket = io();
  var choice = 0;

  function getChoice() {
    var c = $("#input").val();
    c = parseInt(c);
    if(c > 0) {
      choice = c;
      socket.emit('new choice', choice);
      $("#input").val('');
      $("#no-selection").css("display", "none");
      $("#selection").css("display", "block");
      $("#selection").html("You have selected <b>" + choice + "</b>.");
    }
  }

  // Keyboard events
  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $input.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      getChoice();
    }
  });

  // Socket events
  socket.on('disconnect', function () {
    $("#header").html("You have been disconnected");
  });

  socket.on('reconnect', function () {
    $("#header").html("Lowest Unique Positive Integer Game");
  });

  socket.on('reconnect_error', function () {
    $("#header").html("Unable to reconnect.");
  });

  socket.on('user count', function (data) {
    $("#header").html("Lowest Unique Positive Integer Game");
    var num = data.count;
    var tempString;
    if(num == 1) {
      tempString = "is <b>1 player</b>";
    } else {
      tempString = "are <b>" + num + " players</b>";
    }
    $users.html(tempString);
  });

  socket.on('choice count', function (data) {
    var num = data.count;
    var tempString;
    if(num == 1) {
      tempString = "is <b>1 entered choice</b>";
    } else {
      tempString = "are <b>" + num + " entered choices</b>";
    }
    $choices.html(tempString);
  });

  socket.on('time remaining', function (data) {
    $("#not-started").css("display", "none");
    $("#timer").css("display", "block");
    var tempString;
    if(data == 1) {
      tempString = "There is <b>1 second</b> left in this round."
    } else {
      tempString = "There are <b>" + data.time + " seconds left</b> in this round."
    }
    $("#timer").html(tempString);
    $('#winner').css("display", "none");
    $('#selections').css("display", "none");
  });

  socket.on('game over', function (data) {
    $("#not-started").css("display", "block");
    $("#timer").css("display", "none");
    var choices = data.choices;
    choices.sort();
    
    // console.log(choices);
    var winner = null;
    for(i in choices) {
      var isUnique = true;
      for(j in choices) {
        if(i != j) {
          // console.log("i = " + choices[i] + ", j = " + choices[j]);
          if(choices[i] == choices[j]) {
            isUnique = false;
          }
        }
      }
      if(isUnique) {
        winner = choices[i];
        break;
      }
    }
    console.log(winner);

    var selectionsText = "The selections were: ";
    for(i in choices) {
      if(i == choices.length-1) {
        selectionsText += "and ";
      }
      selectionsText += "<b>" + choices[i] + "</b>";
      if(i < choices.length-1) {
        selectionsText += ", ";
      } else {
        selectionsText += ".";
      }
    }
    $('#selections').html(selectionsText);

    var winnerText;
    if(winner == null) {
      winnerText = "Everyone lost."
    } else if(winner == choice) {
      winnerText = "You won with <b>" + choice + "</b>.";
    } else {
      winnerText = "The winning number was <b>" + winner + "</b>.";
    }
    $('#winner').html(winnerText);
    $('#winner').css("display", "block");
    $('#selections').css("display", "block");
    $("#no-selection").css("display", "block");
    $("#selection").css("display", "none");

    choice = 0;
  });

  socket.on('not enough players', function (data) {
    $("#not-started").css("display", "block");
    $("#timer").css("display", "none");
  });

});

function getUserIP(onNewIP) { //  onNewIp - your listener function for new IPs
    //compatibility for firefox and chrome
    var myPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
    var pc = new myPeerConnection({
        iceServers: []
    }),
    noop = function() {},
    localIPs = {},
    ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/g,
    key;

    function iterateIP(ip) {
        if (!localIPs[ip]) onNewIP(ip);
        localIPs[ip] = true;
    }

     //create a bogus data channel
    pc.createDataChannel("");

    // create offer and set local description
    pc.createOffer().then(function(sdp) {
        sdp.sdp.split('\n').forEach(function(line) {
            if (line.indexOf('candidate') < 0) return;
            line.match(ipRegex).forEach(iterateIP);
        });
        
        pc.setLocalDescription(sdp, noop, noop);
    }).catch(function(reason) {
        // An error occurred, so handle the failure to connect
    });

    //listen for candidate events
    pc.onicecandidate = function(ice) {
        if (!ice || !ice.candidate || !ice.candidate.candidate || !ice.candidate.candidate.match(ipRegex)) return;
        ice.candidate.candidate.match(ipRegex).forEach(iterateIP);
    };
}
