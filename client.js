readline = require('readline'),
crypto = require('crypto');
socketio = require('socket.io-client'),
util = require('util'),
color = require("ansi-color").set;
 
var nick;
var secret = '';
var socket = socketio.connect('http://localhost:3636');
var rl = readline.createInterface(process.stdin, process.stdout);


// Set the username
rl.question("Please enter a nickname: ", function(name) {
  nick = name;
  var msg = nick + " has joined the chat";
  socket.emit('send', { type: 'notice', message: msg });
  rl.prompt(true);

  rl.question("What are the goods: ", function(goods) {
    secret = goods;
    rl.prompt(true);
  })
})

rl.on('line', function (line) {
  if (line[0] == "/" && line.length > 1) {
    var cmd = line.match(/[a-z]+\b/)[0];
    var arg = line.substr(cmd.length+2, line.length);
    chat_command(cmd, arg);
 
  } else {
  	//encrypt message
    var cipher = crypto.createCipher('aes-256-ctr', secret);
    var crypted = cipher.update(line, 'utf8', 'hex');
    crypted += cipher.final('hex');

    // send chat message
    socket.emit('send', { type: 'chat', message: crypted, nick: nick });
    rl.prompt(true);
  }
});

function console_out(msg) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  console.log(msg);
  rl.prompt(true);
}

function chat_command(cmd, arg) {
  switch (cmd) {
 
    case 'nick':
      var notice = nick + " changed their name to " + arg;
      nick = arg;
      socket.emit('send', { type: 'notice', message: notice });
      break;
 
    case 'msg':
  		var to = arg.match(/[a-zA-Z]+\b/)[0];
			var message = arg.substr(to.length, arg.length);
			socket.emit('send', { type: 'tell', message: message, to: to, from: nick });
			rl.prompt(true);
			break;
 
    case 'me':
      var emote = nick + " " + arg;
      socket.emit('send', { type: 'emote', message: emote });
      break;
 
    default:
      console_out("That is not a valid command.");
 
    }
}

socket.on('message', function (data) {
  var leader;
  if (data.type == 'chat' && data.nick != nick) {
    leader = color("<"+data.nick+"> ", "green");

    // decrypt message
    var decipher = crypto.createDecipher('aes-256-ctr', secret);
    var dec = decipher.update(data.message,'hex','utf8');
    dec += decipher.final('utf8');
    console_out(leader + dec);
  }
  else if (data.type == "notice") {
    console_out(color(data.message, 'cyan'));
  }
  else if (data.type == "tell" && data.to == nick) {
    leader = color("["+data.from+"->"+data.to+"]", "red");
    console_out(leader + data.message);
  }
  else if (data.type == "emote") {
    console_out(color(data.message, "cyan"));
  }
});