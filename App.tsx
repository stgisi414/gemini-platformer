
import React, { useState, useCallback, useEffect } from 'react';
import { GameState, PlayerState, LevelChunk, GameObject, Enemy, Coin, Spike, Gem } from './types';
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

  function getInitialPlayerState(): PlayerState {
    return {
      position: { x: TILE_SIZE * 2, y: TILE_SIZE * 8 },
      velocity: { x: 0, y: 0 },
      isJumping: false,
      isGrounded: false,
      animationState: 'idle',
    };
  }
  
  const resetGame = useCallback(() => {
    setPlayerState(getInitialPlayerState());
    setLevelChunks([]);
    setScore(0);
    setCameraX(0);
    setError(null);
    setIsLoading(true);

    generateLevelChunks(0, 3)
      .then(result => {
        setLevelChunks(result.chunks);
        if (!result.success) {
          setError("Failed to connect to level generator. Playing with offline levels.");
        }
        setGameState(GameState.Playing);
      })
      .catch(err => {
        console.error("Failed to generate level:", err);
        setError("Could not generate level. Please try again.");
        setGameState(GameState.MainMenu);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const gameUpdate = useCallback((deltaTime: number) => {
    if (gameState !== GameState.Playing) return;

    const dtFactor = deltaTime / (1000 / 60);

    if (isNaN(dtFactor) || dtFactor <= 0 || dtFactor > 5) {
      return;
    }

    setPlayerState(prev => {
      let newVel = { ...prev.velocity };
      let newPos = { ...prev.position };
      let newIsJumping = prev.isJumping;
      let newIsGrounded = false;
      let newAnimationState: PlayerState['animationState'] = 'idle';

      // Horizontal movement
      newVel.x = 0;
      if (keysPressed['a'] || keysPressed['ArrowLeft']) {
        newVel.x = -PLAYER_SPEED * dtFactor;
        newAnimationState = 'run';
      }
      if (keysPressed['d'] || keysPressed['ArrowRight']) {
        newVel.x = PLAYER_SPEED * dtFactor;
        newAnimationState = 'run';
      }
      
      // Apply gravity
      newVel.y += GRAVITY * dtFactor;

      // Jumping
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
      
      const allPlatforms = levelChunks.flatMap(chunk => chunk.platforms);

      // Vertical collision
      for (const platform of allPlatforms) {
        const platformRect = { x: platform.x, y: platform.y, width: platform.width, height: TILE_SIZE };
        
        if (playerRect.x < platformRect.x + platformRect.width &&
            playerRect.x + playerRect.width > platformRect.x &&
            newPos.y + PLAYER_HEIGHT <= platformRect.y &&
            proposedY + PLAYER_HEIGHT >= platformRect.y) {
            
            if (newVel.y >= 0) {
                proposedY = platformRect.y - PLAYER_HEIGHT;
                newVel.y = 0;
                newIsGrounded = true;
                newIsJumping = false;
                if(newAnimationState === 'jump') newAnimationState = 'idle';
            }
        }
      }
      
      playerRect.y = proposedY;

      // Horizontal collision
      for (const platform of allPlatforms) {
        const platformRect = { x: platform.x, y: platform.y, width: platform.width, height: TILE_SIZE };
        if (
            proposedX + PLAYER_WIDTH > platformRect.x &&
            proposedX < platformRect.x + platformRect.width &&
            playerRect.y + PLAYER_HEIGHT > platformRect.y &&
            playerRect.y < platformRect.y + platformRect.height
        ) {
            if (newVel.x > 0) {
                proposedX = platformRect.x - PLAYER_WIDTH;
            } else if (newVel.x < 0) {
                proposedX = platformRect.x + platformRect.width;
            }
            newVel.x = 0;
        }
      }

      newPos.x = proposedX;
      newPos.y = proposedY;

      let collectedCoinIds: number[] = [];
      let collectedGemIds: number[] = [];

      levelChunks.forEach(chunk => {
        chunk.coins.forEach(coin => {
          const coinRect = { x: coin.x, y: coin.y, width: TILE_SIZE, height: TILE_SIZE };
          if (
            newPos.x < coinRect.x + coinRect.width &&
            newPos.x + PLAYER_WIDTH > coinRect.x &&
            newPos.y < coinRect.y + coinRect.height &&
            newPos.y + PLAYER_HEIGHT > coinRect.y
          ) {
            collectedCoinIds.push(coin.id);
          }
        });
        chunk.gems.forEach(gem => {
          const gemRect = { x: gem.x, y: gem.y, width: TILE_SIZE, height: TILE_SIZE };
          if (
            newPos.x < gemRect.x + gemRect.width &&
            newPos.x + PLAYER_WIDTH > gemRect.x &&
            newPos.y < gemRect.y + gemRect.height &&
            newPos.y + PLAYER_HEIGHT > gemRect.y
          ) {
            collectedGemIds.push(gem.id);
          }
        });
        chunk.enemies.forEach(enemy => {
           const enemyRect = { x: enemy.x, y: enemy.y, width: TILE_SIZE, height: TILE_SIZE };
            if (
                newPos.x < enemyRect.x + enemyRect.width &&
                newPos.x + PLAYER_WIDTH > enemyRect.x &&
                newPos.y < enemyRect.y + enemyRect.height &&
                newPos.y + PLAYER_HEIGHT > enemyRect.y
            ) {
                setGameState(GameState.GameOver);
            }
        });
        chunk.spikes.forEach(spike => {
           const spikeRect = { x: spike.x, y: spike.y, width: TILE_SIZE, height: TILE_SIZE };
            if (
                newPos.x < spikeRect.x + spikeRect.width &&
                newPos.x + PLAYER_WIDTH > spikeRect.x &&
                newPos.y < spikeRect.y + spikeRect.height &&
                newPos.y + PLAYER_HEIGHT > spikeRect.y
            ) {
                setGameState(GameState.GameOver);
            }
        });
      });
      
      if(collectedCoinIds.length > 0) {
        setScore(s => s + collectedCoinIds.length * 10);
        setLevelChunks(prevChunks => {
            return prevChunks.map(chunk => ({
                ...chunk,
                coins: chunk.coins.filter(c => !collectedCoinIds.includes(c.id))
            }));
        });
      }

      if(collectedGemIds.length > 0) {
        setScore(s => s + collectedGemIds.length * 50); // Gems are worth more
        setLevelChunks(prevChunks => {
            return prevChunks.map(chunk => ({
                ...chunk,
                gems: chunk.gems.filter(g => !collectedGemIds.includes(g.id))
            }));
        });
      }

      if (newPos.y > TILE_SIZE * 20) {
        setGameState(GameState.GameOver);
      }

      return {
        ...prev,
        position: newPos,
        velocity: newVel,
        isJumping: newIsJumping,
        isGrounded: newIsGrounded,
        animationState: newAnimationState
      };
    });

    setCameraX(prev => playerState.position.x - window.innerWidth / 2.5);
    
    const maxPlayerX = levelChunks.length > 0
        ? Math.max(...levelChunks.map(c => c.startX + LEVEL_CHUNK_WIDTH_TILES * TILE_SIZE))
        : 0;
        
    if (playerState.position.x > maxPlayerX - window.innerWidth && !isLoading && !error) {
        setIsLoading(true);
        const nextChunkStartXTile = maxPlayerX / TILE_SIZE;

        generateLevelChunks(nextChunkStartXTile, 2)
            .then(result => {
                setLevelChunks(prev => [...prev, ...result.chunks]);
                if (!result.success) {
                    setError("Lost connection to level generator. World generation has stopped.");
                }
            }).catch(err => {
                console.error("Failed to generate next level chunk:", err);
                setError("Could not load more of the level.");
            }).finally(() => {
                setIsLoading(false);
            });
    }

  }, [gameState, keysPressed, playerState.position.x, levelChunks, isLoading, error]);

  useGameLoop(gameUpdate, gameState === GameState.Playing);

  const renderGameWorld = () => {
    const allGameObjects: GameObject[] = levelChunks.flatMap(chunk => [
        ...chunk.platforms,
        ...chunk.coins,
        ...chunk.gems,
        ...chunk.enemies,
        ...chunk.spikes,
    ]);

    return (
      <div
        className="relative w-full h-full transition-transform duration-100 ease-linear"
        style={{ transform: `translateX(-${cameraX}px)` }}
      >
        {allGameObjects.map(obj => (
          <Tile key={obj.id} object={obj} />
        ))}
        <Player state={playerState} />
      </div>
    );
  };

  const mainContainerClasses = `w-screen h-screen bg-gradient-to-b from-blue-400 to-blue-800 overflow-hidden ${
    gameState !== GameState.Playing ? 'flex items-center justify-center' : ''
  }`;
  
  return (
    <main className={mainContainerClasses}>
      {gameState === GameState.MainMenu && <StartScreen onStart={resetGame} error={error} />}
      {gameState === GameState.Playing && (
        <>
          <GameUI score={score} />
          {renderGameWorld()}
          {isLoading && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-2xl bg-black bg-opacity-50 p-4 rounded-lg z-20">Loading...</div>}
          {error && <div className="absolute top-16 left-1/2 -translate-x-1/2 text-white text-md bg-red-800 bg-opacity-70 p-2 rounded-lg z-20 shadow-lg">{error}</div>}
        </>
      )}
      {gameState === GameState.GameOver && <GameOverScreen score={score} onRestart={resetGame} />}
    </main>
  );
};

export default App;
