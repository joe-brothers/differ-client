import { Application, Container, Graphics, Text } from "pixi.js";
import type { IScene } from "../types";
import { COLORS } from "../constants";

export class LoadingScene extends Container implements IScene {
  private app: Application;
  private spinner: Graphics;
  private spinnerAngle = 0;

  constructor(app: Application) {
    super();
    this.app = app;
    this.spinner = new Graphics();
  }

  async init(): Promise<void> {
    this.createLoadingText();
    this.createSpinner();
  }

  private createLoadingText(): void {
    const text = new Text({
      text: "Loading...",
      style: {
        fontFamily: "Arial, sans-serif",
        fontSize: 32,
        fontWeight: "bold",
        fill: COLORS.text,
      },
    });
    text.anchor.set(0.5);
    text.position.set(
      this.app.screen.width / 2,
      this.app.screen.height / 2 - 60,
    );
    this.addChild(text);
  }

  private createSpinner(): void {
    this.spinner.position.set(
      this.app.screen.width / 2,
      this.app.screen.height / 2 + 20,
    );
    this.drawSpinnerArc();
    this.addChild(this.spinner);
  }

  private drawSpinnerArc(): void {
    const radius = 30;
    const lineWidth = 4;

    this.spinner.clear();

    // Background circle (dim)
    this.spinner.circle(0, 0, radius);
    this.spinner.stroke({ width: lineWidth, color: 0x333355 });

    // Spinning arc
    this.spinner.arc(
      0,
      0,
      radius,
      this.spinnerAngle,
      this.spinnerAngle + Math.PI * 1.2,
    );
    this.spinner.stroke({ width: lineWidth, color: COLORS.primary });
  }

  update(deltaTime: number): void {
    // Rotate the spinner
    this.spinnerAngle += deltaTime * 0.005;
    this.drawSpinnerArc();
  }

  destroy(): void {
    this.removeAllListeners();
    super.destroy({ children: true });
  }
}
