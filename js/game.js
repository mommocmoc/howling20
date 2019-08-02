var config = {
  type: Phaser.AUTO,
  parent: 'mmorpm',
  width: 1920,
  height: 1080,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

var game = new Phaser.Game(config);

function preload() {}

function create() {}

function update() {}
