import { GoogleGenAI, Type } from "@google/genai";
import { LevelChunk, GameObjectType } from '../types';
import { TILE_SIZE, LEVEL_CHUNK_WIDTH_TILES } from '../constants';

// A stable, hardcoded level to guarantee tiles will render if Gemini fails.
const createFallbackChunk = (startXTile: number): LevelChunk => {
    const startX = startXTile * TILE_SIZE;
    let uniqueId = Date.now() + startX;
    return {
        startX: startX,
        platforms: [
            { id: uniqueId++, x: startX, y: TILE_SIZE * 14, width: TILE_SIZE * 25, type: GameObjectType.Platform, tileType: 'grass' },
        ],
        coins: [], gems: [], enemies: [], spikes: [],
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
        coins: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { x: { type: Type.INTEGER }, y: { type: Type.INTEGER } }, required: ["x", "y"] } },
        gems: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { x: { type: Type.INTEGER }, y: { type: Type.INTEGER } }, required: ["x", "y"] } },
        enemies: {
            type: Type.ARRAY,
            description: "List of enemies. Enemies end the game on contact. Place them on platforms.",
            items: {
                type: Type.OBJECT,
                properties: {
                    x: { type: Type.INTEGER },
                    y: { type: Type.INTEGER },
                    enemyType: { type: Type.STRING, enum: ['slime', 'fly', 'ladybug'] }
                },
                required: ["x", "y", "enemyType"]
            }
        },
        spikes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { x: { type: Type.INTEGER }, y: { type: Type.INTEGER } }, required: ["x", "y"] } }
    },
    required: ["platforms"]
};

export const generateLevelChunks = async (startXTile: number, count: number = 1): Promise<{ success: boolean, chunks: LevelChunk[] }> => {
  const prompt = `Generate ${count} fun, moderately challenging platformer level chunks. Each chunk is ${LEVEL_CHUNK_WIDTH_TILES} tiles wide. Player enters from the left. Ground is around y=14. Ensure platforms are reachable (jump height is ~4 tiles). Use a mix of tile types. Place enemies ON platforms. Place gems in hard-to-reach spots. Coordinates are relative to the chunk (0 to ${LEVEL_CHUNK_WIDTH_TILES - 1}).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: levelChunkSchema }, temperature: 1.0 },
    });
    
    const parsedChunks = JSON.parse(response.text.trim());
    if (!Array.isArray(parsedChunks) || parsedChunks.length === 0) throw new Error("Invalid chunk data.");

    let uniqueId = Date.now();
    const chunks = parsedChunks.map((chunkData: any, index: number) => {
        const chunkStartX = (startXTile + index * LEVEL_CHUNK_WIDTH_TILES) * TILE_SIZE;
        return {
            startX: chunkStartX,
            platforms: (chunkData.platforms || []).map((p: any) => ({ id: uniqueId++, x: chunkStartX + p.x * TILE_SIZE, y: p.y * TILE_SIZE, width: p.width * TILE_SIZE, type: GameObjectType.Platform, tileType: p.tileType })),
            coins: (chunkData.coins || []).map((c: any) => ({ id: uniqueId++, x: chunkStartX + c.x * TILE_SIZE, y: c.y * TILE_SIZE, type: GameObjectType.Coin })),
            gems: (chunkData.gems || []).map((g: any) => ({ id: uniqueId++, x: chunkStartX + g.x * TILE_SIZE, y: g.y * TILE_SIZE, type: GameObjectType.Gem })),
            enemies: (chunkData.enemies || []).map((e: any) => ({
                id: uniqueId++,
                x: chunkStartX + e.x * TILE_SIZE,
                y: e.y * TILE_SIZE,
                type: GameObjectType.Enemy,
                enemyType: e.enemyType,
                // Add initial movement properties
                velocity: { x: 1, y: 0 },
                initialPos: { x: chunkStartX + e.x * TILE_SIZE, y: e.y * TILE_SIZE }
            })),
            spikes: (chunkData.spikes || []).map((s: any) => ({ id: uniqueId++, x: chunkStartX + s.x * TILE_SIZE, y: s.y * TILE_SIZE, type: GameObjectType.Spike })),
        };
    });
    return { success: true, chunks };
  } catch (error) {
    console.error("Error generating level with Gemini, using fallback.", error);
    const fallbackChunks = Array.from({ length: count }, (_, i) => createFallbackChunk(startXTile + i * LEVEL_CHUNK_WIDTH_TILES));
    return { success: false, chunks: fallbackChunks };
  }
};
