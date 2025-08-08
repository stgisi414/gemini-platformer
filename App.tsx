import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, PlayerState, LevelChunk, GameObject, Platform, GameObjectType, Enemy } from './types';
import { useGameLoop } from './hooks/useGameLoop';
import { useKeyboardInput } from './hooks/useKeyboardInput';
import { generateLevelChunks } from './services/levelGenerator';
import Player from './components/Player';
import Tile from './components/Tile';
import GameUI from './components/GameUI';
import StartScreen from './components/StartScreen';
import GameOverScreen from './components/GameOverScreen';
import {
  GRAVITY, PLAYER_JUMP_FORCE, PLAYER_SPEED, TILE_SIZE,
  PLAYER_WIDTH, PLAYER_HEIGHT, LEVEL_CHUNK_WIDTH_TILES
} from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MainMenu);
  const [playerState, setPlayerState] = useState<PlayerState>(getInitialPlayerState());
  const [levelChunks, setLevelChunks] = useState<LevelChunk[]>([]);
  const [cameraX, setCameraX] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const keysPressed = useKeyboardInput();
  const allGameObjects = useRef<GameObject[]>([]);

  useEffect(() => {
    allGameObjects.current = levelChunks.flatMap(chunk =>
      [...chunk.platforms, ...chunk.coins, ...chunk.gems, ...chunk.enemies, ...chunk.spikes]
    );
  }, [levelChunks]);

  function getInitialPlayerState(): PlayerState {
    return {
      position: { x: TILE_SIZE * 2, y: 0 },
      velocity: { x: 0, y: 0 },
      isJumping: true,
      isGrounded: false,
      animationState: 'jump',
    };
  }
  
  const createFallbackLevel = (): LevelChunk[] => {
      let uniqueId = Date.now();
      return [{
          startX: 0,
          platforms: [ { id: uniqueId++, x: 0, y: TILE_SIZE * 14, width: TILE_SIZE * 25, type: GameObjectType.Platform, tileType: 'grass' } ],
          coins: [], gems: [], enemies: [], spikes: [],
      }];
  };

  const resetGame = useCallback(() => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    setScore(0);
    setGameState(GameState.Playing);

    generateLevelChunks(0, 3)
      .then(result => {
        const chunks = (!result.success || result.chunks.length === 0 || result.chunks[0].platforms.length === 0)
          ? createFallbackLevel()
          : result.chunks;
        
        setLevelChunks(chunks);
        
        const firstPlatform = chunks[0].platforms[0];
        const startY = firstPlatform ? firstPlatform.y - PLAYER_HEIGHT : TILE_SIZE * 10;
        setPlayerState({ ...getInitialPlayerState(), position: { x: TILE_SIZE * 2, y: startY }, isGrounded: true, isJumping: false, animationState: 'idle' });

        if (!result.success) setError("Using fallback levels. Connection to generator failed.");
      })
      .catch(err => {
        console.error("Failed to generate level:", err);
        setError("Could not generate level. Using a fallback.");
        setLevelChunks(createFallbackLevel());
        setPlayerState(getInitialPlayerState());
      })
      .finally(() => setIsLoading(false));
  }, [isLoading]);

  const gameUpdate = useCallback((deltaTime: number) => {
    const dtFactor = deltaTime / (1000 / 60);
    if (isNaN(dtFactor) || dtFactor <= 0 || dtFactor > 5) return;

    // --- Enemy Movement ---
    allGameObjects.current.forEach(obj => {
        if (obj.type === GameObjectType.Enemy) {
            const enemy = obj as Enemy;
            if (enemy.enemyType === 'slime' || enemy.enemyType === 'ladybug') {
                enemy.x += enemy.velocity.x * dtFactor * 0.5; // Move slower
                if (Math.abs(enemy.x - enemy.initialPos.x) > TILE_SIZE * 2) {
                    enemy.velocity.x *= -1;
                }
            } else if (enemy.enemyType === 'fly') {
                enemy.y = enemy.initialPos.y + Math.sin(Date.now() / 400) * (TILE_SIZE / 2);
            }
        }
    });

    setPlayerState(prev => {
      let newVel = { ...prev.velocity };
      let newPos = { ...prev.position };
      let newIsJumping = prev.isJumping;
      let newIsGrounded = false;
      let newAnimationState: PlayerState['animationState'] = 'idle';

      newVel.x = 0;
      if (keysPressed['a'] || keysPressed['ArrowLeft']) newVel.x = -PLAYER_SPEED;
      if (keysPressed['d'] || keysPressed['ArrowRight']) newVel.x = PLAYER_SPEED;
      if (newVel.x !== 0) newAnimationState = 'run';

      newVel.y += GRAVITY * dtFactor;

      if ((keysPressed['w'] || keysPressed['ArrowUp'] || keysPressed[' ']) && !prev.isJumping && prev.isGrounded) {
        newVel.y = -PLAYER_JUMP_FORCE;
        newIsJumping = true;
      }

      if (!prev.isGrounded) newAnimationState = 'jump';

      let proposedX = newPos.x + newVel.x * dtFactor;
      let proposedY = newPos.y + newVel.y;

      const platforms = allGameObjects.current.filter(obj => obj.type === GameObjectType.Platform) as Platform[];

      for (const platform of platforms) {
        if ( proposedX + PLAYER_WIDTH > platform.x && proposedX < platform.x + platform.width &&
             prev.position.y + PLAYER_HEIGHT <= platform.y && proposedY + PLAYER_HEIGHT >= platform.y && newVel.y >= 0) {
            proposedY = platform.y - PLAYER_HEIGHT;
            newVel.y = 0;
            newIsGrounded = true;
            newIsJumping = false;
            if (newAnimationState === 'jump') newAnimationState = 'idle';
        }
      }

      for (const platform of platforms) {
        if (
          proposedX + PLAYER_WIDTH > platform.x && proposedX < platform.x + platform.width &&
          proposedY + PLAYER_HEIGHT > platform.y && proposedY < platform.y + TILE_SIZE
        ) {
          if (newVel.x > 0) proposedX = platform.x - PLAYER_WIDTH;
          else if (newVel.x < 0) proposedX = platform.x + platform.width;
        }
      }

      newPos.x = proposedX;
      newPos.y = proposedY;

      if (newPos.y > TILE_SIZE * 20) {
        setGameState(GameState.GameOver);
        return prev;
      }

      const idsToRemove = new Set<number>();
      allGameObjects.current.forEach(obj => {
        if (obj.type === GameObjectType.Platform) return;
        if ( newPos.x < obj.x + TILE_SIZE && newPos.x + PLAYER_WIDTH > obj.x &&
             newPos.y < obj.y + TILE_SIZE && newPos.y + PLAYER_HEIGHT > obj.y ) {
          if (obj.type === GameObjectType.Coin || obj.type === GameObjectType.Gem) idsToRemove.add(obj.id);
          else if (obj.type === GameObjectType.Enemy || obj.type === GameObjectType.Spike) setGameState(GameState.GameOver);
        }
      });

      if (idsToRemove.size > 0) {
        const coins = Array.from(idsToRemove).filter(id => allGameObjects.current.find(o => o.id === id)?.type === GameObjectType.Coin).length;
        const gems = Array.from(idsToRemove).filter(id => allGameObjects.current.find(o => o.id === id)?.type === GameObjectType.Gem).length;
        setScore(s => s + (coins * 10) + (gems * 50));
        setLevelChunks(prevChunks => prevChunks.map(chunk => ({ ...chunk, coins: chunk.coins.filter(c => !idsToRemove.has(c.id)), gems: chunk.gems.filter(g => !idsToRemove.has(g.id)) })));
      }
      
      return { position: newPos, velocity: newVel, isJumping: newIsJumping, isGrounded: newIsGrounded, animationState: newAnimationState };
    });

    const maxPlayerX = levelChunks.length > 0 ? levelChunks[levelChunks.length - 1].startX + LEVEL_CHUNK_WIDTH_TILES * TILE_SIZE : 0;
    if (playerState.position.x > maxPlayerX - window.innerWidth * 1.5 && !isLoading && !error) {
        setIsLoading(true);
        const nextChunkStartXTile = maxPlayerX / TILE_SIZE;
        generateLevelChunks(nextChunkStartXTile, 2)
            .then(result => {
                setLevelChunks(prev => [...prev, ...result.chunks]);
                if (!result.success) setError("Lost connection to level generator.");
            }).catch(() => setError("Could not load more of the level."))
            .finally(() => setIsLoading(false));
    }
  }, [gameState, keysPressed, playerState.position.x, levelChunks, isLoading, error]);

  useGameLoop(gameUpdate, gameState === GameState.Playing);

  useEffect(() => {
    if (gameState === GameState.Playing) {
      const targetCamX = playerState.position.x - window.innerWidth / 3.5;
      setCameraX(prevCamX => prevCamX + (targetCamX - prevCamX) * 0.1);
    }
  }, [playerState.position.x, gameState]);

  const renderGameWorld = () => (
    <div className="relative w-full h-full" style={{ transform: `translateX(-${cameraX}px)` }}>
      {allGameObjects.current.map(obj => <Tile key={obj.id} object={obj} />)}
      <Player state={playerState} />
    </div>
  );

  const mainContainerClasses = `w-screen h-screen bg-gradient-to-b from-blue-400 to-blue-800 overflow-hidden ${gameState !== GameState.Playing ? 'flex items-center justify-center' : ''}`;

  return (
    <main className={mainContainerClasses}>
      {gameState === GameState.MainMenu && <StartScreen onStart={resetGame} error={error} isLoading={isLoading} />}
      {gameState === GameState.Playing && (
        <>
          <GameUI score={score} />
          {renderGameWorld()}
          {isLoading && <div className="fixed top-4 right-4 text-white text-lg bg-black bg-opacity-50 p-3 rounded-lg z-20">Generating more level...</div>}
          {error && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-white text-md bg-red-800 bg-opacity-70 p-2 rounded-lg z-20 shadow-lg">{error}</div>}
        </>
      )}
      {gameState === GameState.GameOver && <GameOverScreen score={score} onRestart={resetGame} isLoading={isLoading} />}
    </main>
  );
};

export default App;
