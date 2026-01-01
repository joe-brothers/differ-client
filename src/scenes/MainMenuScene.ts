import { Application, Container, Graphics, Text } from "pixi.js";
import type { IScene } from "../types";
import { COLORS } from "../constants";
import { game } from "../core/Game";

export class MainMenuScene extends Container implements IScene {
  private app: Application;

  constructor(app: Application) {
    super();
    this.app = app;
  }

  async init(): Promise<void> {
    this.createTitle();
    this.createSprintButton();
  }

  private createTitle(): void {
    const title = new Text({
      text: "Find the Difference",
      style: {
        fontFamily: "Arial, sans-serif",
        fontSize: 48,
        fontWeight: "bold",
        fill: COLORS.text,
      },
    });
    title.anchor.set(0.5);
    title.position.set(this.app.screen.width / 2, this.app.screen.height / 3);
    this.addChild(title);
  }

  private createSprintButton(): void {
    const buttonWidth = 250;
    const buttonHeight = 60;
    const buttonX = this.app.screen.width / 2;
    const buttonY = this.app.screen.height / 2;

    // Button container
    const button = new Container();
    button.position.set(buttonX, buttonY);

    // Button background
    const bg = new Graphics();
    bg.roundRect(
      -buttonWidth / 2,
      -buttonHeight / 2,
      buttonWidth,
      buttonHeight,
      12,
    );
    bg.fill(COLORS.primary);

    // Button text
    const text = new Text({
      text: "5 Sprint",
      style: {
        fontFamily: "Arial, sans-serif",
        fontSize: 28,
        fontWeight: "bold",
        fill: COLORS.text,
      },
    });
    text.anchor.set(0.5);

    button.addChild(bg, text);

    // Make interactive
    button.eventMode = "static";
    button.cursor = "pointer";

    // Hover effects
    button.on("pointerover", () => {
      bg.clear();
      bg.roundRect(
        -buttonWidth / 2,
        -buttonHeight / 2,
        buttonWidth,
        buttonHeight,
        12,
      );
      bg.fill(COLORS.primaryHover);
    });

    button.on("pointerout", () => {
      bg.clear();
      bg.roundRect(
        -buttonWidth / 2,
        -buttonHeight / 2,
        buttonWidth,
        buttonHeight,
        12,
      );
      bg.fill(COLORS.primary);
    });

    // Click handler
    button.on("pointerdown", () => {
      game.startGame();
    });

    this.addChild(button);
  }

  update(): void {
    // No updates needed for menu
  }

  destroy(): void {
    this.removeAllListeners();
    super.destroy({ children: true });
  }
}
