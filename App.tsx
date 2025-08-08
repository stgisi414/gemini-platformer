import React from 'react';
import Tile from './components/Tile';
import { GameObjectType, Platform } from './types';
import { TILE_SIZE } from './constants';

// 1. We create one single, hardcoded platform object.
//    It's a grass platform, 5 tiles wide, positioned near the middle of the screen.
const testPlatform: Platform = {
  id: 1,
  x: TILE_SIZE * 5,
  y: TILE_SIZE * 10,
  width: TILE_SIZE * 5,
  type: GameObjectType.Platform,
  tileType: 'grass',
};

const App: React.FC = () => {
  // 2. The entire app is now just a container with our one Tile component inside.
  return (
    <main className="w-screen h-screen bg-gradient-to-b from-blue-400 to-blue-800 overflow-hidden">
      <div className="relative w-full h-full">
        <Tile object={testPlatform} />
      </div>
    </main>
  );
};

export default App;