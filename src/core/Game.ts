import { Application, Assets } from "pixi.js";
import { SceneManager } from "./SceneManager";
import { gameState } from "../managers/GameStateManager";
import { MainMenuScene } from "../scenes/MainMenuScene";
import { GameScene } from "../scenes/GameScene";
import { LoadingScene } from "../scenes/LoadingScene";
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
    // Show loading screen first
    await this.sceneManager.switchTo(LoadingScene);

    // Select and load images concurrently, with error handling
    const selectedImages = await this.selectAndLoadImages();
    const selectedDifferences = this.selectRandomDifferences(selectedImages);

    // Initialize game state
    gameState.initGame(selectedImages, selectedDifferences);

    // Switch to game scene
    await this.sceneManager.switchTo(GameScene);
  }

  private async selectAndLoadImages(): Promise<ImageData[]> {
    const allAvailableIds = this.getAllAvailableImageIds();
    const shuffledIds = this.shuffleArray(allAvailableIds);

    const loadedImages: ImageData[] = [];
    let candidateIndex = 0;

    // Keep trying until we have enough images
    while (
      loadedImages.length < IMAGES_PER_GAME &&
      candidateIndex < shuffledIds.length
    ) {
      // Take a batch of candidates
      const batchSize = Math.min(
        IMAGES_PER_GAME - loadedImages.length + 2, // Extra buffer for potential failures
        shuffledIds.length - candidateIndex,
      );
      const batch = shuffledIds.slice(
        candidateIndex,
        candidateIndex + batchSize,
      );
      candidateIndex += batchSize;

      // Create image data for the batch
      const candidates = batch.map((id) => ({
        id,
        originalUrl: `${CDN_BASE}${id}.png`,
        differentUrl: `${CDN_BASE}${id}_d.png`,
        diffRects: diffData[id].diff_rects,
      }));

      // Load all images in parallel
      const loadPromises = candidates.map((img) =>
        this.loadImagePair(img)
          .then(() => img)
          .catch(() => null),
      );

      const results = await Promise.all(loadPromises);

      // Add successful loads
      for (const result of results) {
        if (result !== null && loadedImages.length < IMAGES_PER_GAME) {
          loadedImages.push(result);
        }
      }
    }

    if (loadedImages.length < IMAGES_PER_GAME) {
      console.warn(
        `Only loaded ${loadedImages.length}/${IMAGES_PER_GAME} images`,
      );
    }

    return loadedImages;
  }

  private async loadImagePair(image: ImageData): Promise<void> {
    await Promise.all([
      Assets.load(image.originalUrl),
      Assets.load(image.differentUrl),
    ]);
  }

  private getAllAvailableImageIds(): string[] {
    const ids: string[] = [];
    for (let i = 1; i <= TOTAL_AVAILABLE_IMAGES; i++) {
      const id = i.toString().padStart(6, "0");
      if (diffData[id]) {
        ids.push(id);
      }
    }
    return ids;
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
