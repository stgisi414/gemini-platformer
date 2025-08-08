import { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, PlayerState, LevelChunk, GameObject, Platform, GameObjectType } from '../types';
import { generateLevelChunks } from '../services/levelGenerator';
import {
  GRAVITY, PLAYER_JUMP_FORCE, PLAYER_SPEED, TILE_SIZE,
  PLAYER_WIDTH, PLAYER_HEIGHT, LEVEL_CHUNK_WIDTH_TILES
} from '../constants';

// A stable, hardcoded level to guarantee tiles will render if Gemini fails.
const createStaticFallbackLevel = (): LevelChunk[] => {
    let uniqueId = Date.now();
    return [{
        startX: 0,
        platforms: [ { id: uniqueId++, x: 0, y: TILE_SIZE * 14, width: TILE_SIZE * 25, type: GameObjectType.Platform, tileType: 'grass' } ],
        coins: [], gems: [], enemies: [], spikes: [],
    }];
};

function getInitialPlayerState(): PlayerState {
  return {
    position: { x: TILE_SIZE * 2, y: 0 },
    velocity: { x: 0, y: 0 },
    isJumping: true,
    isGrounded: false,
    animationState: 'jump',
    hasDoubleJumped: false,
  };
}

export const useGameState = (keysPressed: { [key: string]: boolean }) => {
  const [gameState, setGameState] = useState<GameState>(GameState.MainMenu);
  const [playerState, setPlayerState] = useState<PlayerState>(getInitialPlayerState());
  const [levelChunks, setLevelChunks] = useState<LevelChunk[]>([]);
  const [score, setScore] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const allGameObjects = useRef<GameObject[]>([]);
  const jumpKeyHeld = useRef(false); // Add this ref

  useEffect(() => {
    allGameObjects.current = levelChunks.flatMap(chunk =>
      [...chunk.platforms, ...chunk.coins, ...chunk.gems, ...chunk.enemies, ...chunk.spikes]
    );
  }, [levelChunks]);

  const resetGame = useCallback(() => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    setScore(0);
    setGameState(GameState.Playing);

    generateLevelChunks(0, 3)
      .then(result => {
        const chunks = (!result.chunks || result.chunks.length === 0 || result.chunks[0].platforms.length === 0)
          ? createStaticFallbackLevel()
          : result.chunks;
        
        setLevelChunks(chunks);
        
        const firstPlatform = chunks[0].platforms[0];
        const startY = firstPlatform ? firstPlatform.y - PLAYER_HEIGHT : TILE_SIZE * 10;
        setPlayerState({
            ...getInitialPlayerState(),
            position: { x: TILE_SIZE * 2, y: startY },
            isGrounded: true,
            isJumping: false,
            animationState: 'idle'
        });

        if (!result.success) {
          setError("Using fallback levels. Connection to generator failed.");
        }
      })
      .catch(err => {
        console.error("Failed to generate level:", err);
        setError("Could not generate level. Using a fallback.");
        setLevelChunks(createStaticFallbackLevel());
        setPlayerState(getInitialPlayerState());
      })
      .finally(() => setIsLoading(false));
  }, [isLoading]);

  const gameUpdate = useCallback((deltaTime: number) => {
    const dtFactor = deltaTime / (1000 / 60);
    if (isNaN(dtFactor) || dtFactor <= 0 || dtFactor > 5) return;

    const isJumpJustPressed = (keysPressed['w'] || keysPressed['ArrowUp'] || keysPressed[' ']) && !jumpKeyHeld.current;

    setPlayerState(prev => {
      let newVel = { ...prev.velocity };
      let newPos = { ...prev.position };
      let newIsJumping = prev.isJumping;
      let newIsGrounded = false;
      let newAnimationState: PlayerState['animationState'] = 'idle';
      let newHasDoubleJumped = prev.hasDoubleJumped;

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

      if (isJumpJustPressed) {
        if (prev.isGrounded) {
          // Regular Jump
          newVel.y = -PLAYER_JUMP_FORCE;
          newIsJumping = true;
        } else if (!newHasDoubleJumped && newIsJumping) {
          // Double Jump
          newVel.y = -PLAYER_JUMP_FORCE * 1.5;
          newHasDoubleJumped = true;
        }
      }

      if (!prev.isGrounded) {
        newAnimationState = 'jump';
      }

      let proposedX = newPos.x + newVel.x;
      let proposedY = newPos.y + newVel.y;
      
      const currentObjects = allGameObjects.current;
      const platforms = currentObjects.filter(obj => obj.type === GameObjectType.Platform) as Platform[];

      for (const platform of platforms) {
        const platformRect = { x: platform.x, y: platform.y, width: platform.width, height: TILE_SIZE };
        if (
          proposedX + PLAYER_WIDTH > platformRect.x && proposedX < platformRect.x + platformRect.width &&
          prev.position.y + PLAYER_HEIGHT <= platformRect.y && proposedY + PLAYER_HEIGHT >= platformRect.y
        ) {
          if (newVel.y >= 0) {
            proposedY = platformRect.y - PLAYER_HEIGHT;
            newVel.y = 0;
            newIsGrounded = true;
            newIsJumping = false;
            newHasDoubleJumped = false;
            if (newAnimationState === 'jump') newAnimationState = 'idle';
          }
        }
      }

      for (const platform of platforms) {
        const platformRect = { x: platform.x, y: platform.y, width: platform.width, height: TILE_SIZE };
        if (
          proposedX + PLAYER_WIDTH > platformRect.x && proposedX < platformRect.x + platformRect.width &&
          proposedY + PLAYER_HEIGHT > platformRect.y && proposedY < platformRect.y + TILE_SIZE
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
      currentObjects.forEach(obj => {
        if (obj.type === GameObjectType.Platform) return;
        const objRect = { x: obj.x, y: obj.y, width: TILE_SIZE, height: TILE_SIZE };
        if (
          newPos.x < objRect.x + objRect.width && newPos.x + PLAYER_WIDTH > objRect.x &&
          newPos.y < objRect.y + objRect.height && newPos.y + PLAYER_HEIGHT > objRect.y
        ) {
          if (obj.type === GameObjectType.Coin || obj.type === GameObjectType.Gem) idsToRemove.add(obj.id);
          else if (obj.type === GameObjectType.Enemy || obj.type === GameObjectType.Spike) setGameState(GameState.GameOver);
        }
      });

      if (idsToRemove.size > 0) {
        const coinsCollected = Array.from(idsToRemove).filter(id => currentObjects.find(o => o.id === id)?.type === GameObjectType.Coin).length;
        const gemsCollected = Array.from(idsToRemove).filter(id => currentObjects.find(o => o.id === id)?.type === GameObjectType.Gem).length;
        setScore(s => s + (coinsCollected * 10) + (gemsCollected * 50));
        setLevelChunks(prevChunks =>
          prevChunks.map(chunk => ({
            ...chunk,
            coins: chunk.coins.filter(c => !idsToRemove.has(c.id)),
            gems: chunk.gems.filter(g => !idsToRemove.has(g.id)),
          }))
        );
      }
      
      return { position: newPos, velocity: newVel, isJumping: newIsJumping, isGrounded: newIsGrounded, animationState: newAnimationState, hasDoubleJumped: newHasDoubleJumped };
    });
  }, [keysPressed]);

  return { gameState, playerState, allGameObjects, score, isLoading, error, resetGame, gameUpdate };
};
