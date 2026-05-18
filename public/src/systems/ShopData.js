export const SHOP_DATA = {
  skins: [
    { id:'default',  name:'Human 544',  price:0,    desc:'O original'          },
    { id:'warrior',  name:'Cavaleiro',  price:500,  desc:'Guerreiro de sangue' },
    { id:'mage',     name:'Mago',       price:800,  desc:'Mestre arcano'       },
    { id:'rogue',    name:'Assassino',  price:1200, desc:'Sombra veloz'        },
    { id:'gold',     name:'Ouro 544',   price:2000, desc:'Riqueza suprema'     },
    { id:'princess', name:'Princesa',   price:1500, desc:'Realeza cor-de-rosa' },
    { id:'ice_queen',name:'Rainha Gelo',price:1800, desc:'Fria como o inverno' },
  ],
  weapons: [
    { id:'standard', name:'Pistola',     price:0,    desc:'Disparo simples'         },
    { id:'double',   name:'Dupla',       price:400,  desc:'2 balas por tiro'        },
    { id:'spread',   name:'Espingarda',  price:800,  desc:'3 balas em leque'        },
    { id:'laser',    name:'Laser',       price:1500, desc:'Raio penetrante'         },
    { id:'rocket',   name:'Foguete',     price:2500, desc:'Explosao em area'        },
    { id:'mjolnir',  name:'Martelo Thor',price:4000, desc:'Raio cai no inimigo atingido' },
  ],
  items: [
    // Max 3 de cada (cap verificado no SaveSystem)
    { id:'extra_heart', name:'+1 Coracao',  price:500, desc:'Vida max +1 (cap 3)', max:3 },
    { id:'speed',       name:'Velocidade+', price:300, desc:'+30% velocidade (cap 3)', max:3 },
    { id:'jump',        name:'Salto+',      price:400, desc:'+25% salto (cap 3)', max:3 },
  ],
  pets: [
    { id:'bird',    name:'Pardal',   price:600,  desc:'Ataca inimigos proximos',        dmg:20,  range:140, atkRate:1.2 },
    { id:'fox',     name:'Raposa',   price:1000, desc:'Dano medio, alcance medio',      dmg:35,  range:120, atkRate:1.8 },
    { id:'dragon',  name:'Dragao',   price:2500, desc:'Alto dano, grande alcance',      dmg:70,  range:200, atkRate:2.5 },
    { id:'bunny',   name:'Coelho',   price:400,  desc:'Coelho agil e rapido',           dmg:8,   range:90,  atkRate:0.8 },
    { id:'wolf',    name:'Lobo',     price:1400, desc:'Lobo feroz, dano medio',         dmg:45,  range:150, atkRate:2.0 },
    { id:'phoenix', name:'Fenix',    price:3500, desc:'Ave de fogo, alto dano em area', dmg:90,  range:220, atkRate:3.0 },
    { id:'turtle',  name:'Tartaruga',price:700,  desc:'Lenta mas muito resistente',     dmg:15,  range:80,  atkRate:1.0 },
    { id:'unicorn', name:'Unicornio',price:2000, desc:'Cura o jogador ao atacar',       dmg:30,  range:160, atkRate:1.5 },
  ],
};

export const MISSIONS_DATA = [
  // Fase 1–10
  { id:'first_phase',   name:'Primeiros Passos',    desc:'Complete a Fase 1',         stat:'maxPhase', target:2,   reward:100,  icon:'🌟' },
  { id:'phase_3',       name:'Indo Longe',           desc:'Alcance a Fase 3',          stat:'maxPhase', target:3,   reward:180,  icon:'🌟' },
  { id:'phase_5',       name:'Metade do Caminho',    desc:'Alcance a Fase 5',          stat:'maxPhase', target:5,   reward:300,  icon:'🚀' },
  { id:'phase_7',       name:'Entrando nas Trevas',  desc:'Alcance a Fase 7',          stat:'maxPhase', target:7,   reward:450,  icon:'🌑' },
  { id:'phase_9',       name:'Quase La',             desc:'Alcance a Fase 9',          stat:'maxPhase', target:9,   reward:600,  icon:'❄' },
  { id:'all_phases',    name:'Mestre do Human 544',  desc:'Complete as 10 fases',      stat:'maxPhase', target:11,  reward:2000, icon:'🏆' },
  // Kills
  { id:'kill_10',       name:'Primeiro Sangue',      desc:'Elimine 10 inimigos',       stat:'kills',    target:10,  reward:60,   icon:'⚔' },
  { id:'kill_50',       name:'Cacador',              desc:'Elimine 50 inimigos',       stat:'kills',    target:50,  reward:150,  icon:'⚔' },
  { id:'kill_100',      name:'Soldado',              desc:'Elimine 100 inimigos',      stat:'kills',    target:100, reward:250,  icon:'⚔' },
  { id:'kill_200',      name:'Guerreiro',            desc:'Elimine 200 inimigos',      stat:'kills',    target:200, reward:400,  icon:'⚔' },
  { id:'kill_500',      name:'Lenda',                desc:'Elimine 500 inimigos',      stat:'kills',    target:500, reward:800,  icon:'💀' },
  { id:'kill_1000',     name:'Exterminador',         desc:'Elimine 1000 inimigos',     stat:'kills',    target:1000,reward:1500, icon:'💀' },
  // Estrelas
  { id:'stars_3',       name:'Colecionador',         desc:'Colete 3 estrelas',         stat:'stars',    target:3,   reward:120,  icon:'★' },
  { id:'stars_5',       name:'Caca Estrelas',        desc:'Colete 5 estrelas',         stat:'stars',    target:5,   reward:250,  icon:'★' },
  { id:'stars_10',      name:'Estrelas do Ceu',      desc:'Colete 10 estrelas',        stat:'stars',    target:10,  reward:500,  icon:'★' },
  { id:'stars_20',      name:'Astronauta',           desc:'Colete 20 estrelas',        stat:'stars',    target:20,  reward:800,  icon:'★' },
  { id:'stars_30',      name:'Universo Completo',    desc:'Colete todas as 30 estrelas',stat:'stars',   target:30,  reward:2000, icon:'★' },
  // Moedas
  { id:'coins_100',     name:'Economista',           desc:'Acumule 100 moedas',        stat:'totalCoins',target:100, reward:50,  icon:'🪙' },
  { id:'coins_500',     name:'Comerciante',          desc:'Acumule 500 moedas',        stat:'totalCoins',target:500, reward:100, icon:'🪙' },
  { id:'coins_2000',    name:'Rico',                 desc:'Acumule 2000 moedas',       stat:'totalCoins',target:2000,reward:200, icon:'🪙' },
  { id:'coins_5000',    name:'Milionario',           desc:'Acumule 5000 moedas',       stat:'totalCoins',target:5000,reward:500, icon:'🪙' },
  // Bosses
  { id:'boss_robot',    name:'Anti-Robo',            desc:'Derrote o Boss Robo',       stat:'bosses',   target:1,   reward:500,  icon:'⚙' },
  { id:'boss_dragon',   name:'Matador de Dragao',    desc:'Derrote o Boss Dragao',     stat:'bosses',   target:2,   reward:1000, icon:'🐉' },
  // Checkpoints
  { id:'checkpoints_5', name:'Salvo!',               desc:'Ative 5 checkpoints',       stat:'checkpoints',target:5, reward:100,  icon:'🏁' },
  { id:'checkpoints_20',name:'Precavido',            desc:'Ative 20 checkpoints',      stat:'checkpoints',target:20,reward:250,  icon:'🏁' },
  // Loja
  { id:'buy_weapon',    name:'Armado',               desc:'Compre 1 arma',             stat:'weaponsBought',target:1,reward:80,  icon:'🔫' },
  { id:'buy_all_weapons',name:'Arsenal',             desc:'Compre todas as armas',     stat:'weaponsBought',target:5,reward:400, icon:'🔫' },
  { id:'unlock_skin',   name:'Estiloso',             desc:'Compre 1 skin',             stat:'skinsBought',  target:1,reward:80,  icon:'👤' },
  { id:'buy_pet',       name:'Parceiro',             desc:'Adquira 1 pet',             stat:'petsBought',   target:1,reward:150, icon:'🐾' },
  { id:'max_heart',     name:'Tanque',               desc:'Compre 3 extra-coracoes',   stat:'item_extra_heart',target:3,reward:300,icon:'❤' },
  { id:'max_speed',     name:'Velocissimo',          desc:'Maximize a velocidade',     stat:'item_speed',   target:3,reward:300, icon:'💨' },
  { id:'max_jump',      name:'Saltador',             desc:'Maximize o salto',          stat:'item_jump',    target:3,reward:300, icon:'⬆' },
  // Especiais
  { id:'no_damage_1',   name:'Intocavel',            desc:'Complete uma fase sem dano',stat:'nodamagePhases',target:1,reward:400,icon:'🛡' },
  { id:'speed_run',     name:'Velocista',            desc:'Complete fase 1 em 60s',    stat:'speedrunPhase1',target:1,reward:350,icon:'⏱' },
  { id:'kill_boss_fast',name:'Rapido',               desc:'Derrote um boss em 60s',    stat:'bossKillFast',  target:1,reward:600,icon:'⚡' },
  // Minijogos
  { id:'football_goal', name:'Goleador',             desc:'Marque 10 gols no futebol', stat:'footballGoals', target:10,reward:200,icon:'⚽' },
  { id:'targets_100',   name:'Atirador',             desc:'Destrua 100 alvos',         stat:'targetsDestroyed',target:100,reward:300,icon:'🎯' },
  { id:'survival_30',   name:'Sobrevivente',         desc:'Sobreviva 30s no modo sobrevivencia',stat:'survivalTime',target:30,reward:250,icon:'⚠' },
  { id:'racing_win',    name:'Piloto',               desc:'Venca uma corrida',         stat:'racingWins',  target:1,reward:300,  icon:'🏎' },
  { id:'snake_100',     name:'Cobrador',             desc:'Alcance 100 pts no Snake',  stat:'snakeScore',  target:100,reward:200,icon:'🐍' },
  { id:'breakout_clear',name:'Quebradiço',           desc:'Complete 1 nivel do Breakout',stat:'breakoutLevels',target:1,reward:200,icon:'🧱' },
  // Progressao
  { id:'phases_3_times',name:'Maratonista',          desc:'Jogue 3 partidas completas',stat:'gamesPlayed', target:3,reward:150,  icon:'🎮' },
  { id:'phases_10_times',name:'Viciado',             desc:'Jogue 10 partidas',         stat:'gamesPlayed', target:10,reward:400, icon:'🎮' },
  { id:'pvp_win',       name:'Duelista',             desc:'Venca no modo PVP',         stat:'pvpWins',     target:1,reward:200,  icon:'🥊' },
  { id:'pvp_5wins',     name:'Campeao',              desc:'Venca 5 vezes no PVP',      stat:'pvpWins',     target:5,reward:500,  icon:'🏆' },
  { id:'use_pet',       name:'Animal de Suporte',    desc:'Destrua 50 inimigos com pets',stat:'petKills',  target:50,reward:400, icon:'🐾' },
  { id:'collect_all_weapons',name:'Armeiro',         desc:'Use todas as 6 armas',      stat:'weaponsUsed', target:6,reward:350,  icon:'🔫' },
];
