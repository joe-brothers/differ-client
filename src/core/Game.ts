import { Application } from "pixi.js";
import { SceneManager } from "./SceneManager";
import { gameState } from "../managers/GameStateManager";
import { MainMenuScene } from "../scenes/MainMenuScene";
import { GameScene } from "../scenes/GameScene";
import type { ImageData, SelectedDifference, ImageDiffData } from "../types";
import {
  CDN_BASE,
  TOTAL_AVAILABLE_IMAGES,
  IMAGES_PER_GAME,
  DIFFS_PER_IMAGE,
} from "../constants";
import diffDataJson from "../tmp_info.json";

const diffData = diffDataJson as Record<string, ImageDiffData>;

export class Game {
  private app: Application;
  private sceneManager: SceneManager;

  constructor(app: Application) {
    this.app = app;
    this.sceneManager = new SceneManager(app);

    // Set up ticker for scene updates
    this.app.ticker.add((ticker) => {
      this.sceneManager.update(ticker.deltaMS);
    });
  }

  async start(): Promise<void> {
    await this.showMainMenu();
  }

  async showMainMenu(): Promise<void> {
    gameState.reset();
    await this.sceneManager.switchTo(MainMenuScene);
  }

  async startGame(): Promise<void> {
    // Select random images and differences
    const selectedImages = this.selectRandomImages();
    const selectedDifferences = this.selectRandomDifferences(selectedImages);

    // Initialize game state
    gameState.initGame(selectedImages, selectedDifferences);

    // Switch to game scene
    await this.sceneManager.switchTo(GameScene);
  }

  private selectRandomImages(): ImageData[] {
    // Get available image IDs (000001 to 000010)
    const availableIds: string[] = [];
    for (let i = 1; i <= TOTAL_AVAILABLE_IMAGES; i++) {
      const id = i.toString().padStart(6, "0");
      if (diffData[id]) {
        availableIds.push(id);
      }
    }

    // Shuffle and pick first IMAGES_PER_GAME
    const shuffled = this.shuffleArray(availableIds);
    const selected = shuffled.slice(0, IMAGES_PER_GAME);

    return selected.map((id) => ({
      id,
      originalUrl: `${CDN_BASE}${id}.png`,
      differentUrl: `${CDN_BASE}${id}_d.png`,
      diffRects: diffData[id].diff_rects,
    }));
  }

  private selectRandomDifferences(images: ImageData[]): SelectedDifference[][] {
    return images.map((image, imageIndex) => {
      // Each image typically has 10 diffs, randomly select 5
      const totalDiffs = image.diffRects.length;
      const indices = Array.from({ length: totalDiffs }, (_, i) => i);
      const shuffledIndices = this.shuffleArray(indices);
      const selectedIndices = shuffledIndices.slice(0, DIFFS_PER_IMAGE);

      return selectedIndices.map((origDiffIndex, localIndex) => ({
        imageIndex,
        diffIndex: localIndex,
        rect: image.diffRects[origDiffIndex],
        found: false,
      }));
    });
  }

  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// Global game instance (set in main.ts)
export let game: Game;

export function setGameInstance(g: Game): void {
  game = g;
}
