import React, { useState, useCallback, useEffect } from 'react';
import { GameState, PlayerState, LevelChunk, GameObject, Platform, GameObjectType } from './types';
import { useGameLoop } from './hooks/useGameLoop';
import { useKeyboardInput } from './hooks/useKeyboardInput';
import Player from './components/Player';
import Tile from './components/Tile';
import GameUI from './components/GameUI';
import StartScreen from './components/StartScreen';
import GameOverScreen from './components/GameOverScreen';
import {
  GRAVITY, PLAYER_JUMP_FORCE, PLAYER_SPEED, TILE_SIZE,
  PLAYER_WIDTH, PLAYER_HEIGHT
} from './constants';

// A stable, hardcoded level to guarantee tiles will render.
const createStaticLevel = (): LevelChunk[] => {
    let uniqueId = 0;
    const chunk: LevelChunk = {
        startX: 0,
        platforms: [
            // A main floor for the player to stand on
            { id: uniqueId++, x: 0, y: TILE_SIZE * 14, width: TILE_SIZE * 25, type: GameObjectType.Platform, tileType: 'grass' },
            // A few platforms to jump on
            { id: uniqueId++, x: TILE_SIZE * 8, y: TILE_SIZE * 11, width: TILE_SIZE * 5, type: GameObjectType.Platform, tileType: 'dirt' },
            { id: uniqueId++, x: TILE_SIZE * 15, y: TILE_SIZE * 9, width: TILE_SIZE * 6, type: GameObjectType.Platform, tileType: 'stone' },
        ],
        coins: [
            { id: uniqueId++, x: TILE_SIZE * 9, y: TILE_SIZE * 10, type: GameObjectType.Coin },
            { id: uniqueId++, x: TILE_SIZE * 10, y: TILE_SIZE * 10, type: GameObjectType.Coin },
        ],
        gems: [ { id: uniqueId++, x: TILE_SIZE * 18, y: TILE_SIZE * 8, type: GameObjectType.Gem } ],
        enemies: [ { id: uniqueId++, x: TILE_SIZE * 5, y: TILE_SIZE * 13, type: GameObjectType.Enemy, enemyType: 'slime' } ],
        spikes: [ { id: uniqueId++, x: TILE_SIZE * 13, y: TILE_SIZE * 13, type: GameObjectType.Spike } ],
    };
    return [chunk];
};

function getInitialPlayerState(): PlayerState {
  // Correctly places the player on the ground level.
  return {
    position: { x: TILE_SIZE * 2, y: TILE_SIZE * 14 - PLAYER_HEIGHT },
    velocity: { x: 0, y: 0 },
    isJumping: false,
    isGrounded: true,
    animationState: 'idle',
  };
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MainMenu);
  const [playerState, setPlayerState] = useState<PlayerState>(getInitialPlayerState());
  const [levelChunks, setLevelChunks] = useState<LevelChunk[]>([]);
  const [cameraX, setCameraX] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const keysPressed = useKeyboardInput();

  const resetGame = useCallback(() => {
    setPlayerState(getInitialPlayerState());
    setLevelChunks(createStaticLevel());
    setScore(0);
    setCameraX(0);
    setError(null);
    setGameState(GameState.Playing);
  }, []);

  const allGameObjects = levelChunks.flatMap(chunk =>
    [...chunk.platforms, ...chunk.coins, ...chunk.gems, ...chunk.enemies, ...chunk.spikes]
  );

  const gameUpdate = useCallback((deltaTime: number) => {
    const dtFactor = deltaTime / (1000 / 60);
    if (isNaN(dtFactor) || dtFactor <= 0 || dtFactor > 5) return;

    setPlayerState(prev => {
      let newVel = { ...prev.velocity };
      let newPos = { ...prev.position };
      let newIsJumping = prev.isJumping;
      let newIsGrounded = false;
      let newAnimationState: PlayerState['animationState'] = 'idle';

      newVel.x = 0;
      if (keysPressed['a'] || keysPressed['ArrowLeft']) {
        newVel.x = -PLAYER_SPEED * dtFactor;
        newAnimationState = 'run';
      }
      if (keysPressed['d'] || keysPressed['ArrowRight']) {
        newVel.x = PLAYER_SPEED * dtFactor;
        newAnimationState = 'run';
      }

      newVel.y += GRAVITY * dtFactor;

      if ((keysPressed['w'] || keysPressed['ArrowUp'] || keysPressed[' ']) && !prev.isJumping && prev.isGrounded) {
        newVel.y = -PLAYER_JUMP_FORCE;
        newIsJumping = true;
      }

      if (!prev.isGrounded) {
        newAnimationState = 'jump';
      }

      let proposedX = newPos.x + newVel.x;
      let proposedY = newPos.y + newVel.y;

      const playerRect = { x: proposedX, y: proposedY, width: PLAYER_WIDTH, height: PLAYER_HEIGHT };

      for (const platform of allGameObjects.filter(obj => obj.type === GameObjectType.Platform) as Platform[]) {
        const platformRect = { x: platform.x, y: platform.y, width: platform.width, height: TILE_SIZE };
        if (
          playerRect.x < platformRect.x + platformRect.width &&
          playerRect.x + PLAYER_WIDTH > platformRect.x &&
          prev.position.y + PLAYER_HEIGHT <= platformRect.y &&
          proposedY + PLAYER_HEIGHT >= platformRect.y
        ) {
          if (newVel.y >= 0) {
            proposedY = platformRect.y - PLAYER_HEIGHT;
            newVel.y = 0;
            newIsGrounded = true;
            newIsJumping = false;
            if (newAnimationState === 'jump') newAnimationState = 'idle';
          }
        }
      }

      playerRect.y = proposedY;

      for (const platform of allGameObjects.filter(obj => obj.type === GameObjectType.Platform) as Platform[]) {
        const platformRect = { x: platform.x, y: platform.y, width: platform.width, height: TILE_SIZE };
        if (
          proposedX + PLAYER_WIDTH > platformRect.x &&
          proposedX < platformRect.x + platformRect.width &&
          playerRect.y + PLAYER_HEIGHT > platformRect.y &&
          playerRect.y < platformRect.y + TILE_SIZE
        ) {
          if (newVel.x > 0) proposedX = platformRect.x - PLAYER_WIDTH;
          else if (newVel.x < 0) proposedX = platformRect.x + platformRect.width;
          newVel.x = 0;
        }
      }

      newPos.x = proposedX;
      newPos.y = proposedY;

      if (newPos.y > TILE_SIZE * 20) {
        setGameState(GameState.GameOver);
        return prev;
      }

      const idsToRemove = new Set<number>();
      allGameObjects.forEach(obj => {
        if (obj.type === GameObjectType.Platform) return;
        const objRect = { x: obj.x, y: obj.y, width: TILE_SIZE, height: TILE_SIZE };
        if (
          newPos.x < objRect.x + objRect.width && newPos.x + PLAYER_WIDTH > objRect.x &&
          newPos.y < objRect.y + objRect.height && newPos.y + PLAYER_HEIGHT > objRect.y
        ) {
          if (obj.type === GameObjectType.Coin || obj.type === GameObjectType.Gem) {
            idsToRemove.add(obj.id);
          } else if (obj.type === GameObjectType.Enemy || obj.type === GameObjectType.Spike) {
            setGameState(GameState.GameOver);
          }
        }
      });

      if (idsToRemove.size > 0) {
        const coinsCollected = Array.from(idsToRemove).filter(id => allGameObjects.find(o => o.id === id)?.type === GameObjectType.Coin).length;
        const gemsCollected = Array.from(idsToRemove).filter(id => allGameObjects.find(o => o.id === id)?.type === GameObjectType.Gem).length;
        setScore(s => s + (coinsCollected * 10) + (gemsCollected * 50));
        
        setLevelChunks(prevChunks =>
          prevChunks.map(chunk => ({
            ...chunk,
            coins: chunk.coins.filter(c => !idsToRemove.has(c.id)),
            gems: chunk.gems.filter(g => !idsToRemove.has(g.id)),
          }))
        );
      }
      
      return {
        ...prev,
        position: newPos,
        velocity: newVel,
        isJumping: newIsJumping,
        isGrounded: newIsGrounded,
        animationState: newAnimationState,
      };
    });
  }, [keysPressed, allGameObjects, gameState]);

  useGameLoop(gameUpdate, gameState === GameState.Playing);

  useEffect(() => {
    if (gameState === GameState.Playing) {
      setCameraX(playerState.position.x - window.innerWidth / 3.5);
    }
  }, [playerState.position.x, gameState]);

  const renderGameWorld = () => (
    <div
      className="relative w-full h-full"
      style={{ transform: `translateX(-${cameraX}px)` }}
    >
      {allGameObjects.map(obj => (
        <Tile key={obj.id} object={obj} />
      ))}
      <Player state={playerState} />
    </div>
  );

  const mainContainerClasses = `w-screen h-screen bg-gradient-to-b from-blue-400 to-blue-800 overflow-hidden ${
    gameState !== GameState.Playing ? 'flex items-center justify-center' : ''
  }`;

  return (
    <main className={mainContainerClasses}>
      {gameState === GameState.MainMenu && <StartScreen onStart={resetGame} error={error} isLoading={isLoading} />}
      {gameState === GameState.Playing && (
        <>
          <GameUI score={score} />
          {renderGameWorld()}
        </>
      )}
      {gameState === GameState.GameOver && <GameOverScreen score={score} onRestart={resetGame} isLoading={isLoading} />}
    </main>
  );
};

export default App;
