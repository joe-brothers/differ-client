import { Application, Container, Assets, Graphics, Sprite } from "pixi.js";
import type { IScene, SelectedDifference } from "../types";
import {
  IMAGE_WIDTH,
  IMAGE_HEIGHT,
  IMAGE_GAP,
  UI_PADDING,
  WRONG_CLICK_COOLDOWN_MS,
  IMAGES_PER_GAME,
} from "../constants";
import { gameState } from "../managers/GameStateManager";
import { game } from "../core/Game";
import { ImagePanel } from "../components/ImagePanel";
import { MaskedDiffSprite } from "../components/MaskedDiffSprite";
import { DiffMarker } from "../components/DiffMarker";
import { Timer } from "../components/Timer";
import { NavButtons } from "../components/NavButtons";
import { ProgressDisplay } from "../components/ProgressDisplay";
import { MenuOverlay } from "../components/MenuOverlay";
import { MenuIcon } from "../components/MenuIcon";
import { CelebrationEffect } from "../components/CelebrationEffect";
import { GameCompleteScreen } from "../components/GameCompleteScreen";

export class GameScene extends Container implements IScene {
  private app: Application;

  // Game area
  private gameArea: Container;
  private leftPanel: ImagePanel | null = null;
  private rightPanelContainer: Container;
  private rightBackgroundSprite: Sprite | null = null;
  private rightMaskedSprite: MaskedDiffSprite | null = null;
  private rightMarkersContainer: Container;
  private rightHitArea: Container | null = null;

  // UI
  private uiLayer: Container;
  private timer: Timer;
  private navButtons: NavButtons;
  private progressDisplay: ProgressDisplay;
  private menuIcon: MenuIcon;

  // Overlays
  private overlayLayer: Container;
  private menuOverlay: MenuOverlay;
  private celebrationEffect: CelebrationEffect;
  private gameCompleteScreen: GameCompleteScreen;

  // Layout
  private imageScale: number = 1;

  constructor(app: Application) {
    super();
    this.app = app;

    // Create containers
    this.gameArea = new Container();
    this.rightPanelContainer = new Container();
    this.rightMarkersContainer = new Container();
    this.uiLayer = new Container();
    this.overlayLayer = new Container();

    // Create UI components
    this.timer = new Timer();
    this.navButtons = new NavButtons();
    this.progressDisplay = new ProgressDisplay();
    this.menuIcon = new MenuIcon();
    this.menuOverlay = new MenuOverlay(app.screen.width, app.screen.height);
    this.celebrationEffect = new CelebrationEffect();
    this.gameCompleteScreen = new GameCompleteScreen(
      app.screen.width,
      app.screen.height,
    );

    // Add to stage
    this.addChild(this.gameArea, this.uiLayer, this.overlayLayer);
  }

  async init(): Promise<void> {
    // Load images for selected images
    await this.loadImages();

    // Setup layout
    this.setupLayout();

    // Setup UI
    this.setupUI();

    // Setup overlays
    this.setupOverlays();

    // Setup event listeners
    this.setupEventListeners();

    // Load first image
    this.loadCurrentImage();

    // Start timer
    this.timer.start();
  }

  // Images are already loaded by Game.ts before this scene is created
  // This method is kept for compatibility but does nothing
  private async loadImages(): Promise<void> {
    // Images already loaded concurrently in Game.selectAndLoadImages()
  }

  private setupLayout(): void {
    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height;

    // Calculate scale to fit both images
    const availableWidth = screenWidth - IMAGE_GAP - UI_PADDING * 2;
    const availableHeight = screenHeight - UI_PADDING * 2 - 80; // 80 for UI top
    const maxImageWidth = availableWidth / 2;

    const scaleX = maxImageWidth / IMAGE_WIDTH;
    const scaleY = availableHeight / IMAGE_HEIGHT;
    this.imageScale = Math.min(scaleX, scaleY, 1);

    const scaledWidth = IMAGE_WIDTH * this.imageScale;
    const scaledHeight = IMAGE_HEIGHT * this.imageScale;

    // Center the game area
    const totalWidth = scaledWidth * 2 + IMAGE_GAP;
    const startX = (screenWidth - totalWidth) / 2;
    const startY = (screenHeight - scaledHeight) / 2 + 20; // Offset for top UI

    this.gameArea.position.set(startX, startY);
  }

  private setupUI(): void {
    // Timer (top left)
    this.timer.position.set(UI_PADDING, UI_PADDING);
    this.uiLayer.addChild(this.timer);

    // Progress display (top center)
    this.progressDisplay.position.set(
      this.app.screen.width / 2 - 40,
      UI_PADDING,
    );
    this.uiLayer.addChild(this.progressDisplay);

    // Menu icon (top right)
    this.menuIcon.position.set(
      this.app.screen.width - UI_PADDING - 44,
      UI_PADDING,
    );
    this.menuIcon.setCallback(() => this.showPauseMenu());
    this.uiLayer.addChild(this.menuIcon);

    // Navigation buttons (bottom center)
    this.navButtons.position.set(
      this.app.screen.width / 2 - 55,
      this.app.screen.height - UI_PADDING - 50,
    );
    this.navButtons.setCallbacks(
      () => gameState.prevImage(),
      () => gameState.nextImage(),
    );
    this.navButtons.updateState(0, IMAGES_PER_GAME);
    this.uiLayer.addChild(this.navButtons);
  }

  private setupOverlays(): void {
    this.menuOverlay.setCallbacks(
      () => this.resumeGame(),
      () => game.showMainMenu(),
    );
    this.gameCompleteScreen.setCallbacks(
      () => game.startGame(), // Play Again
      () => game.showMainMenu(), // Main Menu
    );
    this.overlayLayer.addChild(this.menuOverlay);
    this.overlayLayer.addChild(this.celebrationEffect);
    this.overlayLayer.addChild(this.gameCompleteScreen);
  }

  private setupEventListeners(): void {
    gameState.on("differenceFound", ({ diffIndex, total }) => {
      this.progressDisplay.updateFoundCount(total);
      // Add only the new marker with animation (don't recreate all)
      this.addMarkerForDiff(diffIndex);
    });

    gameState.on("imageCompleted", () => {
      this.playCelebration();
    });

    gameState.on("gameCompleted", () => {
      this.timer.pause();
      const state = gameState.getState();
      this.gameCompleteScreen.show(state.elapsedTime);
    });

    gameState.on("imageChanged", (index: number) => {
      this.loadCurrentImage();
      this.progressDisplay.updateImageIndex(index);
      this.navButtons.updateState(index, IMAGES_PER_GAME);
    });

    gameState.on("inputDisabled", () => {
      this.setInputEnabled(false);
    });

    gameState.on("inputEnabled", () => {
      this.setInputEnabled(true);
    });

    gameState.on("modeChanged", (mode) => {
      if (mode === "paused") {
        this.timer.pause();
      } else if (mode === "playing") {
        this.timer.start();
      }
    });
  }

  private loadCurrentImage(): void {
    const state = gameState.getState();
    const currentImage = state.selectedImages[state.currentImageIndex];
    const currentDiffs = state.selectedDifferences[state.currentImageIndex];

    if (!currentImage) return;

    // Clear game area
    this.gameArea.removeChildren();

    // Get textures
    const originalTexture = Assets.get(currentImage.originalUrl);
    const differentTexture = Assets.get(currentImage.differentUrl);

    // Create left panel (original image)
    this.leftPanel = new ImagePanel(originalTexture);
    this.leftPanel.scale.set(this.imageScale);
    this.leftPanel.setDifferences(
      currentDiffs,
      (diffIndex) => this.handleDiffFound(diffIndex),
      () => this.handleWrongClick(),
    );
    this.gameArea.addChild(this.leftPanel);

    // Create right panel container
    this.rightPanelContainer = new Container();
    this.rightPanelContainer.position.set(
      IMAGE_WIDTH * this.imageScale + IMAGE_GAP,
      0,
    );
    this.rightPanelContainer.scale.set(this.imageScale);

    // Add original image as background on right side
    this.rightBackgroundSprite = new Sprite(originalTexture);
    this.rightPanelContainer.addChild(this.rightBackgroundSprite);

    // Create masked sprite for different image (overlaid on original)
    this.rightMaskedSprite = new MaskedDiffSprite(differentTexture);
    this.rightMaskedSprite.setDifferences(currentDiffs);
    this.rightPanelContainer.addChild(this.rightMaskedSprite);

    // Create markers container for right panel
    this.rightMarkersContainer = new Container();
    this.rightPanelContainer.addChild(this.rightMarkersContainer);

    // Create hit area for right panel (covers entire image, uniform cursor)
    this.rightHitArea = this.createRightHitArea(currentDiffs);
    this.rightPanelContainer.addChild(this.rightHitArea);

    this.gameArea.addChild(this.rightPanelContainer);

    // Update markers for already found differences
    this.updateMarkers();
  }

  private createRightHitArea(currentDiffs: SelectedDifference[]): Container {
    const hitContainer = new Container();

    // Create a single hit area covering the entire image (uniform cursor)
    const fullHitArea = new Graphics();
    fullHitArea.rect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);
    fullHitArea.fill({ color: 0xffffff, alpha: 0 });
    fullHitArea.eventMode = "static";
    fullHitArea.cursor = "default"; // Same cursor everywhere

    fullHitArea.on("pointerdown", (event) => {
      if (gameState.getState().inputDisabled) return;

      const localPos = event.getLocalPosition(fullHitArea);

      // Check if click is within any unfound diff rectangle
      for (let i = 0; i < currentDiffs.length; i++) {
        const diff = currentDiffs[i];
        if (
          !diff.found &&
          localPos.x >= diff.rect.start_point.x &&
          localPos.x <= diff.rect.start_point.x + diff.rect.width &&
          localPos.y >= diff.rect.start_point.y &&
          localPos.y <= diff.rect.start_point.y + diff.rect.height
        ) {
          this.handleDiffFound(i);
          return;
        }
      }

      // Wrong click
      this.handleWrongClick();
    });

    hitContainer.addChild(fullHitArea);

    return hitContainer;
  }

  private handleDiffFound(diffIndex: number): void {
    const state = gameState.getState();
    const currentDiff =
      state.selectedDifferences[state.currentImageIndex][diffIndex];

    if (currentDiff.found) return;

    gameState.markDifferenceFound(state.currentImageIndex, diffIndex);
  }

  private handleWrongClick(): void {
    const state = gameState.getState();
    if (state.inputDisabled) return;

    // Show feedback on both panels
    this.leftPanel?.showWrongClickFeedback();
    this.showRightPanelWrongClickFeedback();

    // Disable input temporarily
    gameState.disableInputTemporarily(WRONG_CLICK_COOLDOWN_MS);
  }

  private showRightPanelWrongClickFeedback(): void {
    if (!this.rightBackgroundSprite) return;
    this.rightBackgroundSprite.tint = 0xff8888;
    setTimeout(() => {
      if (this.rightBackgroundSprite) {
        this.rightBackgroundSprite.tint = 0xffffff;
      }
    }, 200);
  }

  // Recreate all markers without animation (used when navigating between images)
  private updateMarkers(): void {
    const state = gameState.getState();
    const currentDiffs = state.selectedDifferences[state.currentImageIndex];

    // Update left panel markers (no animation)
    this.leftPanel?.updateMarkers();

    // Update right panel markers (no animation)
    this.rightMarkersContainer.removeChildren();
    for (const diff of currentDiffs) {
      if (diff.found) {
        const centerX = diff.rect.start_point.x + diff.rect.width / 2;
        const centerY = diff.rect.start_point.y + diff.rect.height / 2;
        const marker = new DiffMarker(centerX, centerY, undefined, false);
        this.rightMarkersContainer.addChild(marker);
      }
    }
  }

  // Add a single marker with animation (used when finding a new difference)
  private addMarkerForDiff(diffIndex: number): void {
    const state = gameState.getState();
    const diff = state.selectedDifferences[state.currentImageIndex][diffIndex];
    if (!diff?.found) return;

    const centerX = diff.rect.start_point.x + diff.rect.width / 2;
    const centerY = diff.rect.start_point.y + diff.rect.height / 2;

    // Add animated marker to left panel
    this.leftPanel?.addMarkerForDiff(diffIndex);

    // Add animated marker to right panel
    const marker = new DiffMarker(centerX, centerY, undefined, true);
    this.rightMarkersContainer.addChild(marker);
  }

  private setInputEnabled(enabled: boolean): void {
    this.leftPanel?.setInputEnabled(enabled);

    if (this.rightHitArea) {
      for (const child of this.rightHitArea.children) {
        child.eventMode = enabled ? "static" : "none";
        child.cursor = enabled ? "default" : "not-allowed";
      }
    }
  }

  private async playCelebration(): Promise<void> {
    // Disable input during celebration
    this.setInputEnabled(false);

    // Play effect at center of game area
    const centerX =
      this.gameArea.x + (IMAGE_WIDTH * this.imageScale * 2 + IMAGE_GAP) / 2;
    const centerY = this.gameArea.y + (IMAGE_HEIGHT * this.imageScale) / 2;

    await this.celebrationEffect.play(centerX, centerY);

    // Auto-advance to next image if not the last one
    const state = gameState.getState();
    if (
      state.currentImageIndex < IMAGES_PER_GAME - 1 &&
      state.mode !== "completed"
    ) {
      setTimeout(() => {
        gameState.nextImage();
      }, 300);
    }

    // Re-enable input
    if (state.mode === "playing") {
      this.setInputEnabled(true);
    }
  }

  private showPauseMenu(): void {
    gameState.pause();
    this.menuOverlay.show();
  }

  private resumeGame(): void {
    gameState.resume();
    this.menuOverlay.hide();
  }

  update(deltaTime: number): void {
    const state = gameState.getState();
    if (state.mode === "playing") {
      this.timer.update(deltaTime);
      gameState.updateTime(deltaTime);
    }
  }

  destroy(): void {
    // Remove event listeners
    gameState.removeAllListeners();

    this.removeAllListeners();
    super.destroy({ children: true });
  }
}
