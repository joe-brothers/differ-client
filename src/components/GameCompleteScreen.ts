import { Container, Graphics, Text } from "pixi.js";
import { COLORS } from "../constants";

export class GameCompleteScreen extends Container {
  private background: Graphics;
  private contentContainer: Container;
  private onMainMenu: (() => void) | null = null;
  private onPlayAgain: (() => void) | null = null;

  constructor(screenWidth: number, screenHeight: number) {
    super();

    // Semi-transparent background
    this.background = new Graphics();
    this.background.rect(0, 0, screenWidth, screenHeight);
    this.background.fill({ color: COLORS.overlay, alpha: 0.85 });
    this.background.eventMode = "static";
    this.addChild(this.background);

    // Content container
    this.contentContainer = new Container();
    this.contentContainer.position.set(screenWidth / 2, screenHeight / 2);
    this.addChild(this.contentContainer);

    // Hidden by default
    this.visible = false;
  }

  show(elapsedTime: number): void {
    // Clear previous content
    this.contentContainer.removeChildren();

    // Background panel
    const panelWidth = 400;
    const panelHeight = 350;
    const panel = new Graphics();
    panel.roundRect(
      -panelWidth / 2,
      -panelHeight / 2,
      panelWidth,
      panelHeight,
      20,
    );
    panel.fill(0x2a2a4e);
    this.contentContainer.addChild(panel);

    // Title
    const title = new Text({
      text: "Congratulations!",
      style: {
        fontFamily: "Arial, sans-serif",
        fontSize: 36,
        fontWeight: "bold",
        fill: COLORS.success,
      },
    });
    title.anchor.set(0.5);
    title.position.set(0, -120);
    this.contentContainer.addChild(title);

    // Subtitle
    const subtitle = new Text({
      text: "You found all differences!",
      style: {
        fontFamily: "Arial, sans-serif",
        fontSize: 20,
        fill: COLORS.textSecondary,
      },
    });
    subtitle.anchor.set(0.5);
    subtitle.position.set(0, -70);
    this.contentContainer.addChild(subtitle);

    // Time display
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = Math.floor(elapsedTime % 60);
    const timeString = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    const timeLabel = new Text({
      text: "Your Time",
      style: {
        fontFamily: "Arial, sans-serif",
        fontSize: 18,
        fill: COLORS.textSecondary,
      },
    });
    timeLabel.anchor.set(0.5);
    timeLabel.position.set(0, -20);
    this.contentContainer.addChild(timeLabel);

    const timeText = new Text({
      text: timeString,
      style: {
        fontFamily: "Arial, sans-serif",
        fontSize: 56,
        fontWeight: "bold",
        fill: COLORS.text,
      },
    });
    timeText.anchor.set(0.5);
    timeText.position.set(0, 30);
    this.contentContainer.addChild(timeText);

    // Play Again button
    const playAgainBtn = this.createButton("Play Again", -40, COLORS.success);
    playAgainBtn.on("pointerdown", () => this.onPlayAgain?.());
    this.contentContainer.addChild(playAgainBtn);

    // Main Menu button
    const mainMenuBtn = this.createButton("Main Menu", 40, COLORS.primary);
    mainMenuBtn.on("pointerdown", () => this.onMainMenu?.());
    this.contentContainer.addChild(mainMenuBtn);

    this.visible = true;
  }

  private createButton(
    label: string,
    yOffset: number,
    color: number,
  ): Container {
    const buttonWidth = 200;
    const buttonHeight = 50;
    const button = new Container();
    button.position.set(0, 100 + yOffset);

    const bg = new Graphics();
    bg.roundRect(
      -buttonWidth / 2,
      -buttonHeight / 2,
      buttonWidth,
      buttonHeight,
      10,
    );
    bg.fill(color);

    const text = new Text({
      text: label,
      style: {
        fontFamily: "Arial, sans-serif",
        fontSize: 20,
        fontWeight: "bold",
        fill: COLORS.text,
      },
    });
    text.anchor.set(0.5);

    button.addChild(bg, text);

    button.eventMode = "static";
    button.cursor = "pointer";

    const hoverColor = color + 0x222222;
    button.on("pointerover", () => {
      bg.clear();
      bg.roundRect(
        -buttonWidth / 2,
        -buttonHeight / 2,
        buttonWidth,
        buttonHeight,
        10,
      );
      bg.fill(hoverColor);
    });

    button.on("pointerout", () => {
      bg.clear();
      bg.roundRect(
        -buttonWidth / 2,
        -buttonHeight / 2,
        buttonWidth,
        buttonHeight,
        10,
      );
      bg.fill(color);
    });

    return button;
  }

  hide(): void {
    this.visible = false;
  }

  setCallbacks(onPlayAgain: () => void, onMainMenu: () => void): void {
    this.onPlayAgain = onPlayAgain;
    this.onMainMenu = onMainMenu;
  }

  resize(screenWidth: number, screenHeight: number): void {
    this.background.clear();
    this.background.rect(0, 0, screenWidth, screenHeight);
    this.background.fill({ color: COLORS.overlay, alpha: 0.85 });

    this.contentContainer.position.set(screenWidth / 2, screenHeight / 2);
  }
}
