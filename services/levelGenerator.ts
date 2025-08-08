
import { GoogleGenAI, Type } from "@google/genai";
import { LevelChunk, GameObjectType, Platform, Gem, Spike } from '../types';
import { TILE_SIZE, LEVEL_CHUNK_WIDTH_TILES } from '../constants';

// Fallback chunk in case the API fails
const createFallbackChunk = (startXTile: number): LevelChunk => {
    const startX = startXTile * TILE_SIZE;
    let uniqueId = Date.now() + startX;
    return {
        startX: startX,
        platforms: [
            { id: uniqueId++, x: startX, y: TILE_SIZE * 13, width: TILE_SIZE * 10, type: GameObjectType.Platform, tileType: 'grass' },
            { id: uniqueId++, x: startX + TILE_SIZE * 12, y: TILE_SIZE * 11, width: TILE_SIZE * 5, type: GameObjectType.Platform, tileType: 'dirt' },
            { id: uniqueId++, x: startX + TILE_SIZE * 19, y: TILE_SIZE * 9, width: TILE_SIZE * 5, type: GameObjectType.Platform, tileType: 'stone' },
        ],
        coins: [
            { id: uniqueId++, x: startX + TILE_SIZE * 14, y: TILE_SIZE * 9, type: GameObjectType.Coin },
            { id: uniqueId++, x: startX + TILE_SIZE * 15, y: TILE_SIZE * 9, type: GameObjectType.Coin },
        ],
        gems: [
            { id: uniqueId++, x: startX + TILE_SIZE * 22, y: TILE_SIZE * 7, type: GameObjectType.Gem }
        ],
        enemies: [
             { id: uniqueId++, x: startX + TILE_SIZE * 6, y: TILE_SIZE * 12, type: GameObjectType.Enemy, enemyType: 'slime' },
             { id: uniqueId++, x: startX + TILE_SIZE * 14, y: TILE_SIZE * 10, type: GameObjectType.Enemy, enemyType: 'fly' },
        ],
        spikes: [
            { id: uniqueId++, x: startX + TILE_SIZE * 17, y: TILE_SIZE * 13, type: GameObjectType.Spike }
        ],
    };
};


const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const levelChunkSchema = {
    type: Type.OBJECT,
    properties: {
        platforms: {
            type: Type.ARRAY,
            description: "List of platforms. A platform is a solid block the player can stand on.",
            items: {
                type: Type.OBJECT,
                properties: {
                    x: { type: Type.INTEGER, description: `X position of the platform in tile units (0 to ${LEVEL_CHUNK_WIDTH_TILES - 1}).` },
                    y: { type: Type.INTEGER, description: "Y position in tile units (e.g., 1 to 15, where higher is lower on screen)." },
                    width: { type: Type.INTEGER, description: "Width of the platform in tile units (e.g., 2 to 8)." },
                    tileType: { type: Type.STRING, enum: ['grass', 'dirt', 'stone', 'snow', 'sand', 'castle'], description: "Visual style of the platform." }
                },
                required: ["x", "y", "width", "tileType"]
            }
        },
        coins: {
            type: Type.ARRAY,
            description: "List of coins. Coins are collectibles for points.",
            items: {
                type: Type.OBJECT,
                properties: {
                    x: { type: Type.INTEGER, description: `X position in tile units (0 to ${LEVEL_CHUNK_WIDTH_TILES - 1}).` },
                    y: { type: Type.INTEGER, description: "Y position in tile units." }
                },
                 required: ["x", "y"]
            }
        },
        gems: {
            type: Type.ARRAY,
            description: "List of gems. Gems are rare, high-value collectibles.",
            items: {
                type: Type.OBJECT,
                properties: {
                    x: { type: Type.INTEGER, description: `X position in tile units (0 to ${LEVEL_CHUNK_WIDTH_TILES - 1}).` },
                    y: { type: Type.INTEGER, description: "Y position in tile units." }
                },
                required: ["x", "y"]
            }
        },
        enemies: {
            type: Type.ARRAY,
            description: "List of enemies. Enemies end the game on contact. Place them on platforms.",
            items: {
                type: Type.OBJECT,
                properties: {
                    x: { type: Type.INTEGER, description: `X position in tile units (0 to ${LEVEL_CHUNK_WIDTH_TILES - 1}).` },
                    y: { type: Type.INTEGER, description: "Y position in tile units." },
                    enemyType: { type: Type.STRING, enum: ['slime', 'fly', 'ladybug'], description: "The type of enemy." }
                },
                required: ["x", "y", "enemyType"]
            }
        },
        spikes: {
            type: Type.ARRAY,
            description: "List of spike hazards. They damage the player on contact. Place them on platforms or floors.",
            items: {
                type: Type.OBJECT,
                properties: {
                    x: { type: Type.INTEGER, description: `X position in tile units (0 to ${LEVEL_CHUNK_WIDTH_TILES - 1}).` },
                    y: { type: Type.INTEGER, description: "Y position in tile units." }
                },
                required: ["x", "y"]
            }
        }
    },
    required: ["platforms", "coins", "gems", "enemies", "spikes"]
};

export const generateLevelChunks = async (startXTile: number, count: number = 1): Promise<{ success: boolean, chunks: LevelChunk[] }> => {
  const prompt = `
    Generate ${count} fun and moderately challenging platformer level chunks using a variety of tiles and objects.
    Each chunk is ${LEVEL_CHUNK_WIDTH_TILES} tiles wide.
    The player will enter from the left. The ground level is around y=14.
    Ensure platforms are reachable with a jump. A player can jump about 3-4 tiles high.
    Use a mix of platform tile types: 'grass', 'dirt', 'stone', 'snow', 'sand', 'castle'. Create visually distinct areas.
    Place enemies ON platforms, not floating. Use different enemy types: 'slime' (walks), 'fly' (can be in the air), 'ladybug' (walks).
    Place 'spikes' as hazards on surfaces.
    Place 'coins' for players to collect.
    Place 'gems' in hard-to-reach, rewarding spots.
    The start X coordinate for all objects in each chunk should be relative to that chunk, from 0 to ${LEVEL_CHUNK_WIDTH_TILES - 1}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: levelChunkSchema
        },
        temperature: 1.0,
      },
    });

    const jsonText = response.text.trim();
    if (!jsonText) {
        throw new Error("API returned empty response.");
    }
    
    const parsedChunks = JSON.parse(jsonText);

    if (!Array.isArray(parsedChunks) || parsedChunks.length === 0) {
        throw new Error("Parsed data is not a valid array of chunks.");
    }

    let uniqueId = Date.now();
    const chunks = parsedChunks.map((chunkData: any, index: number) => {
        const chunkStartX = (startXTile + index * LEVEL_CHUNK_WIDTH_TILES) * TILE_SIZE;
        return {
            startX: chunkStartX,
            platforms: (chunkData.platforms || []).map((p: any) => ({
                id: uniqueId++,
                x: chunkStartX + p.x * TILE_SIZE,
                y: p.y * TILE_SIZE,
                width: p.width * TILE_SIZE,
                type: GameObjectType.Platform,
                tileType: p.tileType
            })),
            coins: (chunkData.coins || []).map((c: any) => ({
                id: uniqueId++,
                x: chunkStartX + c.x * TILE_SIZE,
                y: c.y * TILE_SIZE,
                type: GameObjectType.Coin
            })),
            gems: (chunkData.gems || []).map((g: any) => ({
                id: uniqueId++,
                x: chunkStartX + g.x * TILE_SIZE,
                y: g.y * TILE_SIZE,
                type: GameObjectType.Gem
            })),
            enemies: (chunkData.enemies || []).map((e: any) => ({
                id: uniqueId++,
                x: chunkStartX + e.x * TILE_SIZE,
                y: e.y * TILE_SIZE,
                type: GameObjectType.Enemy,
                enemyType: e.enemyType
            })),
            spikes: (chunkData.spikes || []).map((s: any) => ({
                id: uniqueId++,
                x: chunkStartX + s.x * TILE_SIZE,
                y: s.y * TILE_SIZE,
                type: GameObjectType.Spike
            })),
        };
    });
    return { success: true, chunks };
  } catch (error) {
    console.error("Error generating level with Gemini, using fallback.", error);
    const fallbackChunks = Array.from({ length: count }, (_, i) => createFallbackChunk(startXTile + i * LEVEL_CHUNK_WIDTH_TILES));
    return { success: false, chunks: fallbackChunks };
  }
};
