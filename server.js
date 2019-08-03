const express = require('express');
var app = express();
var server = require('http').Server(app)
var io = require('socket.io')(server)
var osc = require('osc.io')
var players = {}
var star = {
  x: Math.floor(Math.random() * 700) + 50,
  y: Math.floor(Math.random() * 500) + 50
};
var scores = {
  blue: 0,
  red: 0
};
osc(io)
var oscServer = io.of('http://localhost/osc/servers/8000');
var oscClient = io.of('http://localhost/osc/clients/8000');
setInterval(function() {
  oscClient.emit('message', ['/osc/test', 200])
}, 1000)
app.use('/assets', express.static('./public'))
app.use('/scripts', express.static('./node_modules/phaser/dist/'))
// app.use('/scripts', express.static('./node_modules/osc-js/lib'))
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html')
})

server.listen(3000, function() {
  console.log('Listening on ' + server.address().port);

})

io.on('connection', function(socket) {
  console.log('user connected : ', socket.id);
  //player Setting
  players[socket.id] = {
    rotation: 0,
    x: Math.floor(Math.random() * 880) + 50,
    y: Math.floor(Math.random() * 1820) + 50,
    playerId: socket.id,
    team: (Math.floor(Math.random() * 2) == 0) ? 'red' : 'blue'
  }
  //send the players objec to the new player
  socket.emit('currentPlayers', players);
  // send the star object to the new player
  socket.emit('starLocation', star);
  // send the current scores
  socket.emit('scoreUpdate', scores);
  //update all other players of the new player
  socket.broadcast.emit('newPlayer', players[socket.id]);

  socket.on('disconnect', function() {
    //remove player from players object
    delete players[socket.id]
    //emit a message to all players to remove this player
    io.emit('disconnect', socket.id)
    console.log('user disconnected', socket.id);
  })
  // 'playerMovement'이벤트를 수신하고 movementData에 x,y,rotation값 수신
  // 움직임 데이터를 해당 소켓 오브젝트에 반영함
  // 그리고 이 플레이어 정보를 'playedMoved'라는 이벤트로 players[socekt.id]를 접속한 클라이언트 전체 송출
  socket.on('playerMovement', function(movementData) {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    players[socket.id].rotation = movementData.rotation;
    // emit a message to all players about the player that moved
    socket.broadcast.emit('playerMoved', players[socket.id]);
  });

  socket.on('starCollected', function() {
    if (players[socket.id].team === 'red') {
      scores.red += 10;
    } else {
      scores.blue += 10;
    }
    star.x = Math.floor(Math.random() * 700) + 50;
    star.y = Math.floor(Math.random() * 500) + 50;
    io.emit('starLocation', star);
    io.emit('scoreUpdate', scores);
  });
})

//random int 값 받기 , 나중에 캐릭터 설정 할 때 사용 가능할 듯
function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

// console.log(getRandomInt(3));
// expected output: 0, 1 or 2
