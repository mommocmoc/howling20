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
      debug: true,
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
var masterBullets;
var bullets;
var otherBullets;
var otherMasterBullets;
var speed;
var stats;
var cursors;
var masterLastFired = 0;
var lastFired = 0;
var otherLastFired = 0;
var bossLife;
var ship;


function preload() {

  this.load.image('ship', 'assets/img/character.png')
  this.load.image('master', 'assets/img/character.png')
  this.load.image('otherPlayer', 'assets/img/character.png')
  this.load.image('star', 'assets/img/star_gold.png')
  this.load.image('bullet', 'assets/img/bullet.svg')

}

function create(time, delta) {

  //총알
  var Bullet = new Phaser.Class({

    Extends: Phaser.GameObjects.Image,

    initialize:

      function Bullet(scene) {
        Phaser.GameObjects.Image.call(this, scene, 0, 0, 'bullet');

        this.speed = Phaser.Math.GetSpeed(1000, 1);
      },

    fire: function(x, y) {
      this.setPosition(x, y - 50);

      this.setActive(true);
      this.setVisible(true);
    },

    update: function(time, delta) {
      this.y -= this.speed * delta;

      if (this.y < -50) {
        this.setActive(false);
        this.setVisible(false);
      }
    }

  });
  var MasterBullet = new Phaser.Class({

    Extends: Phaser.GameObjects.Image,

    initialize:

      function Bullet(scene) {
        Phaser.GameObjects.Image.call(this, scene, 0, 0, 'bullet');
        this.setDisplaySize(20, 20);
        this.setSize(20, 20, true);
        this.speed = Phaser.Math.GetSpeed(1000, 1);
      },

    fire: function(x, y) {
      this.setPosition(x, y - 50);

      this.setActive(true);
      this.setVisible(true);
    },

    update: function(time, delta) {
      this.y += this.speed * delta;

      if (this.y > 1920) {
        this.setActive(false);
        this.setVisible(false);
      }
    }
  });
  bullets = this.physics.add.group({
    classType: Bullet,
    maxSize: 10,
    runChildUpdate: true
  });

  masterBullets = this.physics.add.group({
    classType: MasterBullet,
    maxSize: 10,
    runChildUpdate: true
  });
  otherBullets = this.physics.add.group({
    classType: Bullet,
    maxSize: 10,
    runChildUpdate: true
  });

  otherMasterBullets = this.physics.add.group({
    classType: MasterBullet,
    maxSize: 10,
    runChildUpdate: true
  });
  var self = this;


  this.socket = io()
  this.otherPlayers = this.physics.add.group();
  this.otherBullets = this.physics.add.group();
  if(this.otherPlayers.length > 0){
      this.master = this.otherPlayers[0]
      console.log(this.master);
  }

  // this.ship = this.physics.add.group()

  //'currentPlayers'이벤트 받으면  할일
  this.socket.on('currentPlayers', function(players) {
    Object.keys(players).forEach(function(id) {
      if (players[id].playerId === self.socket.id && players[id].isMaster === true) {
        addMaster(self, players[id])
      } else if (players[id].playerId === self.socket.id) {
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
  this.blueScoreText = this.add.text(50, 50, '', {
    fontSize: '52px',
    fill: '#0000FF'
  });
  this.redScoreText = this.add.text(50, 1800, '', {
    fontSize: '32px',
    fill: '#FF0000'
  });
  //HP이벤트
  this.socket.on('hpUpdate', function(players) {
    var player = players[self.socket.id]
    //console.log(player);
    //console.log(self.otherPlayers.getChildren());
    var otherPlayers = self.otherPlayers.getChildren()
    self.otherPlayers.getChildren().forEach(function(otherPlayer) {
      //console.log(otherPlayer);
      if (otherPlayer.isMaster === true) {
        bossLife = otherPlayer.life
      }

      if (player.isMaster === false && otherPlayers.length > 0) {
        self.blueScoreText.setText('Boss Life point :' + bossLife)
      }
    });
    if (player.isMaster) {
      self.blueScoreText.setText('My Life Point : ' + player.life)
    }
  })

  //스코어 업데이트 이벤트 받으면 할 일
  this.socket.on('scoreUpdate', function(scores) {
    var score = scores[self.socket.id]
    if (score.isMaster === false) {
      self.redScoreText.setText('My score: ' + score.MyScore);
    }
  })
  this.socket.on('lifeUpdate',function(playersLife) {
    //console.log(playersLife);
    self.otherPlayers.getChildren().forEach(function(otherPlayer) {
      if(otherPlayer.playerId === playersLife.playerId){
        otherPlayer.life = playersLife.life;
      }
      if(otherPlayer.isMaster){
        self.blueScoreText.setText('Boss Life point :' + otherPlayer.life)
      }
    });
    if(self.ship.playerId === playersLife.playerId){
      self.ship.life = playersLife.life;
    }
    if(self.ship.isMaster === playersLife.isMaster){
      self.blueScoreText.setText('My Life Point : ' + self.ship.life)
      if(self.ship.life < 0){
        self.ship.destroy()
      }
    }
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
  //input 추가하기 : 터치포인터 1개 추가 총 2개, 키보드 화살표 입력 추가
  cursors = this.input.keyboard.createCursorKeys();
  this.input.addPointer(1);
  //bullet 발사되면
  this.socket.on('bulletFired', function(bulletInfo) {
    self.otherPlayers.getChildren().forEach(function(otherPlayer) {
      if (bulletInfo.playerId === otherPlayer.playerId) {
        if (bulletInfo.isMaster) {
          var otherMasterBullet = otherMasterBullets.get();
          if (otherMasterBullet) {
            otherMasterBullet.fire(bulletInfo.x, bulletInfo.y);
          }
        } else {
          var otherBullet = otherBullets.get();
          if (otherBullet) {
            otherBullet.fire(bulletInfo.x, bulletInfo.y)
          }
        }
      }
    });
  });
  // console.log(this.otherPlayers);
    // self.physics.add.collider(this.otherPlayers, otherMasterBullets, bulletEvent, null, self);
    self.physics.add.collider(this.otherPlayers, bullets, bulletEventB,null, self);
    self.physics.add.collider(this.otherPlayers, masterBullets,bulletEvent, null, self);
    // self.physics.add.collider(otherBullets,tbulletEventB,null, self);

    //self.physics.add.collider(otherMasterBullets,this.ship, bulletEventC, null, self);
}

function bulletEvent(player, otherBullet) {
    // console.log(players);
    if(!player.isMaster){
      otherBullet.destroy()
      this.socket.emit('attack',player.playerId);
    }
}

function bulletEventB(player, otherBullet) {
  if(player.isMaster){
    otherBullet.destroy()
    this.socket.emit('attack',player.playerId);
  }
}
function bulletEventC(otherBullet, player) {
    otherBullet.destroy()
    console.log('wpqkf');
}
// add self.player
function addMaster(self, playerInfo) {
  //ship = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(53 * 5, 40 * 5);
  self.ship = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(53 * 5, 40 * 5);
  self.ship.setDrag(100);
  self.ship.setAngularDrag(100);
  self.ship.setMaxVelocity(200);
  self.ship.setRotation(0);
  self.ship.playerId = playerInfo.playerId;
  self.ship.life = playerInfo.life;
  self.ship.isMaster = playerInfo.isMaster;
  // self.ship.isParent = true;
  console.log(self.ship);
  console.log(ship);
  //ship = self.ship
};

function addPlayer(self, playerInfo) {
  self.ship = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(53 * 2, 40 * 2);
  self.ship.setTint(0xff0000);
  self.ship.setDrag(100);
  self.ship.setAngularDrag(100);
  self.ship.setMaxVelocity(200);
  self.ship.setRotation(0);
  self.ship.setCollideWorldBounds(true);
  self.ship.playerId = playerInfo.playerId;
  self.ship.isMaster = playerInfo.isMaster;
  self.ship.life = playerInfo.life;
  ship = self.ship
}

// add anoter players
function addOtherPlayers(self, playerInfo) {
  if (playerInfo.isMaster === true) {
    const otherPlayer = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayer').setOrigin(0.5, 0.5).setDisplaySize(53 * 5, 40 * 5);
    //otherPlayer.setSize(53 * 5, 40 * 5);
    otherPlayer.playerId = playerInfo.playerId;
    otherPlayer.life = playerInfo.life;
    otherPlayer.isMaster = playerInfo.isMaster;
    self.otherPlayers.add(otherPlayer);
  } else {
    const otherPlayer = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayer').setOrigin(0.5, 0.5).setDisplaySize(53 * 2, 40 * 2);
    otherPlayer.setSize(53 * 2, 40 * 2, true);
    otherPlayer.setTint(0x0000ff);
    otherPlayer.playerId = playerInfo.playerId;
    otherPlayer.life = playerInfo.life;
    otherPlayer.isMaster = playerInfo.isMaster;
    self.otherPlayers.add(otherPlayer);
  }
};
var socket = this.socket

function update(time, delta) {

  if (this.ship) {
    this.cursors = this.input.keyboard.createCursorKeys();

    if (this.cursors.left.isDown) {
      // this.ship.setAngularVelocity(-150);
      this.ship.x -= 3;
    } else if (this.cursors.right.isDown) {
      // this.ship.setAngularVelocity(150);
      this.ship.x += 3;
    } else {
      this.ship.setAngularVelocity(0);
    }
    //
    // if (this.cursors.up.isDown) {
    //   this.physics.velocityFromRotation(this.ship.rotation + 1.5, 100, this.ship.body.acceleration);
    // } else {
    //   this.ship.setAcceleration(0);
    // }
    this.input.on('pointermove', function(pointer) {
      this.physics.moveToObject(this.ship, target, 2000);
    }, this)
    if (this.input.pointer1.isDown) {
      target.x = this.input.pointer1.x;
      target.y = this.input.pointer1.y;
    }
    //포인터 다운 이벤트 단순히 입력받을 때
    // this.input.on('pointerdown',function(pointer) {
    //
    // })
    //두번째 손가락 터치하면 플레이어 총알 나감
    if (this.input.pointer1.isDown) {
      var bullet = bullets.get();
      if (bullet) {
        bullet.fire(this.ship.x, this.ship.y)
        this.socket.emit('BulletFire', {
          x: bullet.x,
          y: bullet.y,
          playerId: this.socket.id,
          isMaster: false
        });
        lastFired = time + 50;
      }
    }


    //화살표 위 누르면 내꺼 총알 나감
    if (cursors.up.isDown && time > lastFired) {
      var masterBullet = masterBullets.get();

      if (masterBullet) {

        masterBullet.fire(this.ship.x, this.ship.y+200);
        this.socket.emit('BulletFire', {
          x: masterBullet.x,
          y: masterBullet.y,
          playerId: this.socket.id,
          isMaster: true
        });
        masterLastFired = time + 50;
      }
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
