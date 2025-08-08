import React from 'react';
import { GameObject, GameObjectType, Platform, Enemy, EnemyType, PlatformTileType } from '../types';
import { ASSET_URLS, TILE_SIZE } from '../constants';

interface TileProps {
  object: GameObject;
}

const enemyUrlMap: Record<EnemyType, string> = {
    slime: ASSET_URLS.enemySlime,
    fly: ASSET_URLS.enemyFly,
    ladybug: ASSET_URLS.enemyLadybug,
};

const platformUrlMap: Record<PlatformTileType, string> = {
    grass: ASSET_URLS.grass,
    dirt: ASSET_URLS.dirt,
    stone: ASSET_URLS.stone,
    snow: ASSET_URLS.snow,
    sand: ASSET_URLS.sand,
    castle: ASSET_URLS.castle,
};

const Tile: React.FC<TileProps> = ({ object }) => {
  const isPlatform = object.type === GameObjectType.Platform;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: object.x,
    top: object.y,
    width: isPlatform ? (object as Platform).width : TILE_SIZE,
    height: TILE_SIZE,
    imageRendering: 'pixelated', // Keep images crisp
  };

  switch (object.type) {
    case GameObjectType.Platform:
      const platform = object as Platform;
      style.backgroundImage = `url(${platformUrlMap[platform.tileType]})`;
      style.backgroundRepeat = 'repeat-x'; // Repeat only for platforms
      style.backgroundSize = `${TILE_SIZE}px ${TILE_SIZE}px`;
      break;
    case GameObjectType.Coin:
      style.backgroundImage = `url(${ASSET_URLS.coin})`;
      break;
    case GameObjectType.Gem:
      style.backgroundImage = `url(${ASSET_URLS.gem})`;
      break;
    case GameObjectType.Enemy:
      const enemy = object as Enemy;
      style.backgroundImage = `url(${enemyUrlMap[enemy.enemyType]})`;
      break;
    case GameObjectType.Spike:
        style.backgroundImage = `url(${ASSET_URLS.spikes})`;
        break;
    default:
      return null;
  }

  return <div style={style} />;
};

export default Tile;