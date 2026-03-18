export interface ToolContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  activeLayer: any;
}

export abstract class BaseTool {
  abstract name: string;
  abstract onStart(ctx: ToolContext, x: number, y: number, pressure: number): void;
  abstract onMove(ctx: ToolContext, x: number, y: number, pressure: number): void;
  abstract onEnd(ctx: ToolContext): void;
}
