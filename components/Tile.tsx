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
  const style: React.CSSProperties = {
    position: 'absolute',
    left: object.x,
    top: object.y,
    width: object.type === GameObjectType.Platform ? (object as Platform).width : TILE_SIZE,
    height: TILE_SIZE,
    backgroundRepeat: object.type === GameObjectType.Platform ? 'repeat-x' : 'no-repeat',
    backgroundSize: object.type === GameObjectType.Platform ? `${TILE_SIZE}px ${TILE_SIZE}px` : 'contain',
    imageRendering: 'pixelated', // crisp images
  };

  switch (object.type) {
    case GameObjectType.Platform:
      const platform = object as Platform;
      style.backgroundImage = `url(${platformUrlMap[platform.tileType]})`;
      style.backgroundColor = '#8B4513'; // Brown fallback for platforms
      break;
    case GameObjectType.Coin:
      style.backgroundImage = `url(${ASSET_URLS.coin})`;
      style.backgroundColor = '#FFD700'; // Gold fallback for coins
      break;
    case GameObjectType.Gem:
      style.backgroundImage = `url(${ASSET_URLS.gem})`;
      style.backgroundColor = '#DC143C'; // Crimson fallback for gems
      break;
    case GameObjectType.Enemy:
      const enemy = object as Enemy;
      style.backgroundImage = `url(${enemyUrlMap[enemy.enemyType]})`;
      style.backgroundColor = '#8A2BE2'; // BlueViolet fallback for enemies
      break;
    case GameObjectType.Spike:
        style.backgroundImage = `url(${ASSET_URLS.spikes})`;
        style.backgroundColor = '#696969'; // DimGray fallback for spikes
        break;
    default:
      return null;
  }

  return <div style={style} />;
};

export default Tile;
