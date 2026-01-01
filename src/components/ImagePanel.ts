import {
  Container,
  Sprite,
  Graphics,
  Texture,
  FederatedPointerEvent,
} from "pixi.js";
import type { DiffRect, SelectedDifference } from "../types";
import { IMAGE_WIDTH, IMAGE_HEIGHT } from "../constants";
import { DiffMarker } from "./DiffMarker";

export class ImagePanel extends Container {
  private sprite: Sprite;
  private clickArea: Graphics;
  private markersContainer: Container;
  private differences: SelectedDifference[] = [];
  private onDiffFound: ((diffIndex: number) => void) | null = null;
  private onWrongClick: (() => void) | null = null;

  constructor(texture: Texture) {
    super();

    // Create image sprite
    this.sprite = new Sprite(texture);
    this.addChild(this.sprite);

    // Create markers container (on top of image)
    this.markersContainer = new Container();
    this.addChild(this.markersContainer);

    // Create invisible click area for click detection
    this.clickArea = new Graphics();
    this.clickArea.rect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);
    this.clickArea.fill({ color: 0xffffff, alpha: 0 });
    this.clickArea.eventMode = "static";
    this.clickArea.cursor = "default"; // Uniform cursor, no hints
    this.clickArea.on("pointerdown", this.handleClick.bind(this));
    this.addChild(this.clickArea);
  }

  setDifferences(
    differences: SelectedDifference[],
    onDiffFound: (diffIndex: number) => void,
    onWrongClick: () => void,
  ): void {
    this.differences = differences;
    this.onDiffFound = onDiffFound;
    this.onWrongClick = onWrongClick;
    this.updateMarkers();
  }

  updateTexture(texture: Texture): void {
    this.sprite.texture = texture;
  }

  private handleClick(event: FederatedPointerEvent): void {
    const localPos = event.getLocalPosition(this.sprite);

    // Check if click is within any unfound diff rectangle
    for (let i = 0; i < this.differences.length; i++) {
      const diff = this.differences[i];
      if (
        !diff.found &&
        this.isPointInRect(localPos.x, localPos.y, diff.rect)
      ) {
        this.onDiffFound?.(i);
        return;
      }
    }

    // Wrong click
    this.onWrongClick?.();
  }

  private isPointInRect(x: number, y: number, rect: DiffRect): boolean {
    return (
      x >= rect.start_point.x &&
      x <= rect.start_point.x + rect.width &&
      y >= rect.start_point.y &&
      y <= rect.start_point.y + rect.height
    );
  }

  // Recreate all markers without animation (used when navigating between images)
  updateMarkers(): void {
    this.markersContainer.removeChildren();

    for (const diff of this.differences) {
      if (diff.found) {
        const centerX = diff.rect.start_point.x + diff.rect.width / 2;
        const centerY = diff.rect.start_point.y + diff.rect.height / 2;
        // No animation for pre-existing markers
        const marker = new DiffMarker(centerX, centerY, undefined, false);
        this.markersContainer.addChild(marker);
      }
    }
  }

  // Add a single marker with animation (used when finding a new difference)
  addMarkerForDiff(diffIndex: number): void {
    const diff = this.differences[diffIndex];
    if (!diff?.found) return;

    const centerX = diff.rect.start_point.x + diff.rect.width / 2;
    const centerY = diff.rect.start_point.y + diff.rect.height / 2;
    // Animate the new marker
    const marker = new DiffMarker(centerX, centerY, undefined, true);
    this.markersContainer.addChild(marker);
  }

  setInputEnabled(enabled: boolean): void {
    this.clickArea.eventMode = enabled ? "static" : "none";
    this.clickArea.cursor = enabled ? "default" : "not-allowed";
  }

  showWrongClickFeedback(): void {
    // Flash red tint
    this.sprite.tint = 0xff8888;
    setTimeout(() => {
      this.sprite.tint = 0xffffff;
    }, 200);
  }
}
