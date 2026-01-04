// Diff rectangle from JSON data
export interface DiffRect {
  start_point: { x: number; y: number };
  width: number;
  height: number;
}

// Image data structure from tmp_info.json
export interface ImageDiffData {
  diff_rects: DiffRect[];
}

// Parsed image data for game use
export interface ImageData {
  id: string;
  originalUrl: string;
  differentUrl: string;
  diffRects: DiffRect[];
}

// Selected difference for tracking found state
export interface SelectedDifference {
  imageIndex: number;
  diffIndex: number;
  rect: DiffRect;
  found: boolean;
}

// Game mode types
export type GameMode = "menu" | "playing" | "paused" | "completed";

// Game state
export interface GameState {
  mode: GameMode;
  currentImageIndex: number;
  selectedImages: ImageData[];
  selectedDifferences: SelectedDifference[][];
  foundCount: number;
  elapsedTime: number;
  inputDisabled: boolean;
}

// Scene interface
export interface IScene {
  init(): Promise<void>;
  update(deltaTime: number): void;
  destroy(): void;
  resize?(width: number, height: number): void;
}
