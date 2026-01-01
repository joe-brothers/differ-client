import { EventEmitter } from "pixi.js";
import type {
  GameState,
  GameMode,
  ImageData,
  SelectedDifference,
} from "../types";
import { IMAGES_PER_GAME, TOTAL_DIFFS_PER_GAME } from "../constants";

export class GameStateManager extends EventEmitter {
  private state: GameState;

  constructor() {
    super();
    this.state = this.getInitialState();
  }

  private getInitialState(): GameState {
    return {
      mode: "menu",
      currentImageIndex: 0,
      selectedImages: [],
      selectedDifferences: [],
      foundCount: 0,
      elapsedTime: 0,
      inputDisabled: false,
    };
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  // Mode management
  setMode(mode: GameMode): void {
    this.state.mode = mode;
    this.emit("modeChanged", mode);
  }

  // Game initialization
  initGame(images: ImageData[], differences: SelectedDifference[][]): void {
    this.state = {
      mode: "playing",
      currentImageIndex: 0,
      selectedImages: images,
      selectedDifferences: differences,
      foundCount: 0,
      elapsedTime: 0,
      inputDisabled: false,
    };
    this.emit("gameInitialized");
  }

  // Difference found
  markDifferenceFound(imageIndex: number, diffIndex: number): void {
    const diff = this.state.selectedDifferences[imageIndex]?.[diffIndex];
    if (!diff || diff.found) return;

    diff.found = true;
    this.state.foundCount++;
    this.emit("differenceFound", {
      imageIndex,
      diffIndex,
      total: this.state.foundCount,
    });

    // Check if all diffs for current image are found
    const currentDiffs = this.state.selectedDifferences[imageIndex];
    if (currentDiffs.every((d) => d.found)) {
      this.emit("imageCompleted", imageIndex);

      // Check if game is completed
      if (this.state.foundCount === TOTAL_DIFFS_PER_GAME) {
        this.state.mode = "completed";
        this.emit("gameCompleted", this.state.elapsedTime);
      }
    }
  }

  // Navigation
  navigateToImage(index: number): void {
    const newIndex = Math.max(0, Math.min(IMAGES_PER_GAME - 1, index));
    if (newIndex !== this.state.currentImageIndex) {
      this.state.currentImageIndex = newIndex;
      this.emit("imageChanged", newIndex);
    }
  }

  nextImage(): void {
    this.navigateToImage(this.state.currentImageIndex + 1);
  }

  prevImage(): void {
    this.navigateToImage(this.state.currentImageIndex - 1);
  }

  // Input management
  disableInputTemporarily(durationMs: number = 1000): void {
    if (this.state.inputDisabled) return;

    this.state.inputDisabled = true;
    this.emit("inputDisabled");

    setTimeout(() => {
      this.state.inputDisabled = false;
      this.emit("inputEnabled");
    }, durationMs);
  }

  // Timer
  updateTime(deltaMs: number): void {
    if (this.state.mode === "playing") {
      this.state.elapsedTime += deltaMs / 1000;
      this.emit("timeUpdated", this.state.elapsedTime);
    }
  }

  // Pause/Resume
  pause(): void {
    if (this.state.mode === "playing") {
      this.state.mode = "paused";
      this.emit("modeChanged", "paused");
    }
  }

  resume(): void {
    if (this.state.mode === "paused") {
      this.state.mode = "playing";
      this.emit("modeChanged", "playing");
    }
  }

  // Reset
  reset(): void {
    this.state = this.getInitialState();
    this.emit("reset");
  }

  // Getters for current state
  getCurrentImage(): ImageData | null {
    return this.state.selectedImages[this.state.currentImageIndex] ?? null;
  }

  getCurrentDifferences(): SelectedDifference[] {
    return this.state.selectedDifferences[this.state.currentImageIndex] ?? [];
  }

  getFoundCountForImage(imageIndex: number): number {
    const diffs = this.state.selectedDifferences[imageIndex];
    return diffs ? diffs.filter((d) => d.found).length : 0;
  }
}

// Singleton instance
export const gameState = new GameStateManager();
