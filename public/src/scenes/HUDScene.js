class HUDScene extends Phaser.Scene {
  constructor() { super({ key:'HUDScene', active:false }); }

  init(data) {
    this.health = data.health || 3;
    this.config = data.config || {};
    this.coins  = data.coins  || 0;
  }

  create() {
    const W = 960;
    this._paused = false;

    // Barra topo
    const bar = this.add.graphics();
    bar.fillStyle(0x000000, 0.65);
    bar.fillRect(0, 0, W, 46);

    // Nome da fase
    this.add.text(W/2, 23, this.config.subtitle || '', {
      fontSize:'12px', fontFamily:'monospace', fontStyle:'bold', color:'#aabbcc',
    }).setOrigin(0.5);

    // Corações
    this.hearts = [];
    for (let i = 0; i < 3; i++)
      this.hearts.push(this.add.image(22 + i*26, 23, 'hud_heart').setScale(0.9));

    // Nome do player
    this.add.text(100, 23, SaveSystem.getPlayerName(), {
      fontSize:'11px', fontFamily:'monospace', color:'#556677',
    }).setOrigin(0, 0.5);

    // Moedas
    this.add.image(W - 195, 23, 'coin').setScale(0.9);
    this.coinTxt = this.add.text(W - 181, 23, `${this.coins}`, {
      fontSize:'13px', fontFamily:'monospace', fontStyle:'bold', color:'#ffd700',
    }).setOrigin(0, 0.5);

    // Botão loja
    this._makeBtn(W - 130, 23, '🛒', () => {
      this.scene.pause('GameScene');
      this.scene.launch('ShopScene');
      this.scene.get('ShopScene').events.once('shutdown', () => this.scene.resume('GameScene'));
    });

    // Botão missões
    this._makeBtn(W - 88, 23, '📋', () => {
      this.scene.pause('GameScene');
      this.scene.launch('MissionsScene');
      this.scene.get('MissionsScene').events.once('shutdown', () => this.scene.resume('GameScene'));
    });

    // Botão pausar
    this._makeBtn(W - 46, 23, '⏸', () => this._togglePause());

    // Número da fase
    const stageCol = this.config.stage === 'B' ? '#ff4444' : '#4488ff';
    this.add.text(W - 14, 23, `F${this.config.phase}`, {
      fontSize:'18px', fontFamily:'monospace', fontStyle:'bold', color:stageCol,
    }).setOrigin(1, 0.5);

    // Mensagem flutuante
    this.msgTxt = this.add.text(W/2, 70, '', {
      fontSize:'15px', fontFamily:'monospace', fontStyle:'bold',
      color:'#ffc400', stroke:'#000000', strokeThickness:4,
    }).setOrigin(0.5).setAlpha(0);

    // Pausa overlay (criado mas invisível)
    this._pauseOverlay = this._createPauseOverlay(W);

    // Eventos
    this.events.on('healthChanged', hp => this._updateHearts(hp));
    this.events.on('coins',   n  => this.coinTxt.setText(`${n}`));
    this.events.on('checkpoint', id => this._showMsg(`✓ CHECKPOINT ${id} SALVO`, '#00e676'));
    this.events.on('message', msg   => this._showMsg(msg, '#ffc400'));
  }

  _makeBtn(x, y, label, cb) {
    const btn = this.add.text(x, y, label, {
      fontSize:'16px', fontFamily:'monospace',
      backgroundColor:'#111133', padding:{x:6,y:4},
    }).setOrigin(0.5).setInteractive({ useHandCursor:true });
    btn.on('pointerover',  () => btn.setStyle({ backgroundColor:'#223388' }));
    btn.on('pointerout',   () => btn.setStyle({ backgroundColor:'#111133' }));
    btn.on('pointerdown',  cb);
    return btn;
  }

  _createPauseOverlay(W) {
    const c = this.add.container(W/2, 270).setVisible(false).setDepth(50);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.8); bg.fillRoundedRect(-220,-150,440,300,16);
    c.add(bg);
    c.add(this.add.text(0,-110,'⏸ PAUSADO',{fontSize:'24px',fontFamily:'monospace',fontStyle:'bold',color:'#ffffff'}).setOrigin(0.5));

    // Botão continuar
    const cont = this.add.text(0,-40,'▶  Continuar',{fontSize:'18px',fontFamily:'monospace',color:'#00e676',backgroundColor:'#0d2210',padding:{x:20,y:10}}).setOrigin(0.5).setInteractive({useHandCursor:true});
    cont.on('pointerdown', () => this._togglePause());
    c.add(cont);

    // Botão loja
    const shop = this.add.text(0,20,'🛒  Loja',{fontSize:'16px',fontFamily:'monospace',color:'#ffd700',backgroundColor:'#1a1500',padding:{x:20,y:8}}).setOrigin(0.5).setInteractive({useHandCursor:true});
    shop.on('pointerdown', () => { this._togglePause(); this.scene.launch('ShopScene'); });
    c.add(shop);

    // Botão menu
    const menu = this.add.text(0,76,'← Menu Principal',{fontSize:'14px',fontFamily:'monospace',color:'#ff4757',backgroundColor:'#1a0505',padding:{x:20,y:8}}).setOrigin(0.5).setInteractive({useHandCursor:true});
    menu.on('pointerdown', () => { this.scene.stop('HUDScene'); this.scene.stop('GameScene'); this.scene.start('ModeScene'); });
    c.add(menu);

    return c;
  }

  _togglePause() {
    this._paused = !this._paused;
    this._pauseOverlay.setVisible(this._paused);
    if (this._paused) {
      this.scene.pause('GameScene');
    } else {
      this.scene.resume('GameScene');
    }
  }

  _updateHearts(hp) {
    this.hearts.forEach((h, i) => h.setTexture(i < hp ? 'hud_heart' : 'hud_heart_empty'));
  }

  _showMsg(text, color) {
    this.msgTxt.setText(text).setColor(color).setAlpha(1);
    this.tweens.killTweensOf(this.msgTxt);
    this.tweens.add({ targets:this.msgTxt, alpha:0, delay:2500, duration:500 });
  }
}
