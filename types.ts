export enum GameState {
  MainMenu,
  Playing,
  GameOver,
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface PlayerState {
  position: Vector2D;
  velocity: Vector2D;
  isJumping: boolean;
  isGrounded: boolean;
  animationState: 'idle' | 'run' | 'jump';
  hasDoubleJumped: boolean;
  direction: 'left' | 'right';
}

export enum GameObjectType {
  Platform,
  Coin,
  Enemy,
  Spike,
  Gem,
  Laser,
}

export interface BaseGameObject {
  id: number;
  x: number;
  y: number;
  type: GameObjectType;
}

export type PlatformTileType = 'grass' | 'dirt' | 'stone' | 'snow' | 'sand' | 'castle';

export interface Platform extends BaseGameObject {
  type: GameObjectType.Platform;
  width: number;
  tileType: PlatformTileType;
}

export interface Coin extends BaseGameObject {
  type: GameObjectType.Coin;
}

export interface Gem extends BaseGameObject {
  type: GameObjectType.Gem;
}

export type EnemyType = 'slime' | 'fly' | 'ladybug';

export interface Enemy extends BaseGameObject {
  type: GameObjectType.Enemy;
  enemyType: EnemyType;
  // New properties for movement
  velocity: Vector2D;
  initialPos: Vector2D;
}

export interface Spike extends BaseGameObject {
    type: GameObjectType.Spike;
}

export interface Laser extends BaseGameObject {
    type: GameObjectType.Laser;
    velocity: Vector2D;
}

export type GameObject = Platform | Coin | Enemy | Spike | Gem | Laser;

export interface LevelChunk {
  startX: number;
  platforms: Platform[];
  coins: Coin[];
  gems: Gem[];
  enemies: Enemy[];
  spikes: Spike[];
}
