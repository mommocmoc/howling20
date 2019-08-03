var config = {
  type: Phaser.AUTO,
  parent: 'mmorpm',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1080,
    height: 1920,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: {
        y: 0
      }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

var game = new Phaser.Game(config);
var target = new Phaser.Math.Vector2();
function preload() {

  this.load.image('ship', 'assets/img/character.png')
  this.load.image('otherPlayer', 'assets/img/character.png')
  this.load.image('star', 'assets/img/star_gold.png')

}

function create() {
  var self = this;

  this.socket = io()
  this.otherPlayers = this.physics.add.group();
  //'currentPlayers'이벤트 받으면  할일
  this.socket.on('currentPlayers', function(players) {
    Object.keys(players).forEach(function(id) {
      if (players[id].playerId === self.socket.id) {
        addPlayer(self, players[id])
      } else {
        addOtherPlayers(self, players[id])
      }
    })
  });
  //'newPlayer'받으면 할일
  this.socket.on('newPlayer', function(playerInfo) {
    addOtherPlayers(self, playerInfo);
  });
  //'disconnect'받으면 할일
  this.socket.on('disconnect', function(playerId) {
    self.otherPlayers.getChildren().forEach(function(otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });
  //키보드 인풋 받겠다
  this.cursors = this.input.keyboard.createCursorKeys();
  //터치 인풋
  //this.input.addPointer(1);

  //'playerMoved'이벤트를 서버에서 수신하고 playerInfo에 수신받은 players[socket.id]정보 입력
  this.socket.on('playerMoved', function(playerInfo) {
    //otherPlayers 오브젝트
    self.otherPlayers.getChildren().forEach(function(otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.setRotation(playerInfo.rotation);
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });
  });
  //스코어 부분 텍스트 렌더링
  this.blueScoreText = this.add.text(16, 16, '', {
    fontSize: '32px',
    fill: '#0000FF'
  });
  this.redScoreText = this.add.text(584, 16, '', {
    fontSize: '32px',
    fill: '#FF0000'
  });
  //스코어 업데이트 이벤트 받으면 할 일
  this.socket.on('scoreUpdate', function(scores) {
    self.blueScoreText.setText('Blue: ' + scores.blue);
    self.redScoreText.setText('Red: ' + scores.red);
  })
  self.socket.on('starLocation', function(starLocation) {
    if (!self.star) {
      self.star = self.physics.add.image(starLocation.x, starLocation.y, 'star')
      self.physics.add.overlap(self.ship, self.star, function dummyCollectStar() {
        this.socket.emit('starCollected');
      }, null, self);
    } else {
      self.star.x = starLocation.x;
      self.star.y = starLocation.y;
    }
  });

}

function update() {

  if (this.ship) {
    this.input.on('pointermove',function (pointer) {
      target.x = pointer.x;
      target.y = pointer.y;
      this. physics.moveToObject(this.ship, target, 2000);
    }, this)
    if (this.cursors.left.isDown) {
      this.ship.setAngularVelocity(-150);
    } else if (this.cursors.right.isDown) {
      this.ship.setAngularVelocity(150);
    } else {
      this.ship.setAngularVelocity(0);
    }

    if (this.cursors.up.isDown) {
      this.physics.velocityFromRotation(this.ship.rotation + 1.5, 100, this.ship.body.acceleration);
    } else {
      this.ship.setAcceleration(0);
    }

    this.physics.world.wrap(this.ship, 5);

    var x = this.ship.x;
    var y = this.ship.y;
    var r = this.ship.rotation;

    //배의 이전 움직임이 현재 값과 다르 'playerMovement'이벤트와 ,x,y,rotation값을 서버로 보냄
    if (this.ship.oldPosition && (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y || r !== this.ship.oldPosition.rotation)) {
      this.socket.emit('playerMovement', {
        x: this.ship.x,
        y: this.ship.y,
        rotation: this.ship.rotation
      });
    }

    // save old position data
    this.ship.oldPosition = {
      x: this.ship.x,
      y: this.ship.y,
      rotation: this.ship.rotation
    };
  }

}

// add self.player
function addPlayer(self, playerInfo) {
  self.ship = self.physics.add.image(playerInfo.x, playerInfo.y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
  if (playerInfo.team === 'blue') {
    self.ship.setTint(0x0000ff);
  } else {
    self.ship.setTint(0xff0000);
  }
  self.ship.setDrag(100);
  self.ship.setAngularDrag(100);
  self.ship.setMaxVelocity(200);
}

// add anoter players
function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayer').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
  if (playerInfo.team === 'blue') {
    otherPlayer.setTint(0x0000ff);
  } else {
    otherPlayer.setTint(0xff0000);
  }
  otherPlayer.playerId = playerInfo.playerId;
  self.otherPlayers.add(otherPlayer);
}
