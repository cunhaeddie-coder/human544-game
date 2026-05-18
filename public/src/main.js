import { ThreeEngine }    from './engine/ThreeEngine.js';
import { Input }          from './engine/Input.js';
import { SceneManager }   from './engine/SceneManager.js';

// Cenas principais
import { BootScene }      from './scenes/BootScene.js';
import { MenuScene }      from './scenes/MenuScene.js';
import { ModeScene }      from './scenes/ModeScene.js';
import { GameScene }      from './scenes/GameScene.js';

// Loja / Progresso
import { ShopScene }      from './scenes/ShopScene.js';
import { MissionsScene }  from './scenes/MissionsScene.js';

// Ranking
import { RankingScene }   from './scenes/RankingScene.js';

// Modos de jogo
import { PVPScene }       from './scenes/PVPScene.js';
import { LeisureScene }   from './scenes/LeisureScene.js';
import { OnlineScene }    from './scenes/OnlineScene.js';

// Mini jogos
import { SurvivalScene }  from './scenes/SurvivalScene.js';
import { FootballScene }  from './scenes/FootballScene.js';
import { TargetsScene }   from './scenes/TargetsScene.js';
import { RacingScene }    from './scenes/RacingScene.js';
import { SumoScene }      from './scenes/SumoScene.js';
import { CoinRushScene }  from './scenes/CoinRushScene.js';
import { DodgeScene }     from './scenes/DodgeScene.js';
import { KingHillScene }  from './scenes/KingHillScene.js';
import { BombScene }      from './scenes/BombScene.js';
import { BreakoutScene }  from './scenes/BreakoutScene.js';
import { SnakeScene }     from './scenes/SnakeScene.js';
import { ColorFloorScene }from './scenes/ColorFloorScene.js';
import { MinecraftScene } from './scenes/MinecraftScene.js';
import { HordeScene }    from './scenes/HordeScene.js';

const engine  = new ThreeEngine();
const input   = new Input();
const manager = new SceneManager(engine, input);

// Registrar todas as cenas
manager.register('BootScene',      BootScene);
manager.register('MenuScene',      MenuScene);
manager.register('ModeScene',      ModeScene);
manager.register('GameScene',      GameScene);
manager.register('ShopScene',      ShopScene);
manager.register('MissionsScene',  MissionsScene);
manager.register('RankingScene',   RankingScene);
manager.register('PVPScene',       PVPScene);
manager.register('OnlineScene',    OnlineScene);
manager.register('LeisureScene',   LeisureScene);
manager.register('SurvivalScene',  SurvivalScene);
manager.register('FootballScene',  FootballScene);
manager.register('TargetsScene',   TargetsScene);
manager.register('RacingScene',    RacingScene);
manager.register('SumoScene',      SumoScene);
manager.register('CoinRushScene',  CoinRushScene);
manager.register('DodgeScene',     DodgeScene);
manager.register('KingHillScene',  KingHillScene);
manager.register('BombScene',      BombScene);
manager.register('BreakoutScene',  BreakoutScene);
manager.register('SnakeScene',     SnakeScene);
manager.register('ColorFloorScene',ColorFloorScene);
manager.register('MinecraftScene', MinecraftScene);
manager.register('HordeScene',     HordeScene);

engine.start(dt => { manager.update(dt); input.flush(); });

manager.start('BootScene');
