import { BaseTool, ToolContext } from './BaseTool';
import { StrokeEngine, Point } from './StrokeEngine';
import { useEdgelessStore } from '../store';

export class BrushTool extends BaseTool {
  name = 'brush' as const;
  private engine = new StrokeEngine();
  private isDrawing = false;
  public spacing = 0.1; // 10% of size is default spacing
  private lastSmoothedPoint: Point | null = null;
  private leftoverDistance = 0;

  public size = 20;
  public noiseEnabled = false;
  public noiseParams = { scale: 1.0, octaves: 4 };

  // dynamics
  public streamline = 0;     // 0-100
  public sizeJitter = 0;     // 0-100
  public angleJitter = 0;    // 0-100
  public scatter = 0;        // 0-100
  public blend = 0;          // 0-100 (wet edge mixing)
  public pressureCurve = [0.25, 0.1, 0.25, 1.0]; // cubic bezier

  onStart(ctx: ToolContext, x: number, y: number, pressure: number) {
    const store = useEdgelessStore.getState();
    this.size = store.penWidth;
    
    this.isDrawing = true;
    this.engine.clear();
    const mappedPressure = this.applyPressureCurve(pressure);
    const point = this.engine.addPoint({ x, y, pressure: mappedPressure });
    this.lastSmoothedPoint = point;
    this.leftoverDistance = 0;

    // Draw the initial dot
    this.drawDot(ctx, point);
  }

  onMove(ctx: ToolContext, x: number, y: number, pressure: number) {
    if (!this.isDrawing || !this.lastSmoothedPoint) return;

    const mappedPressure = this.applyPressureCurve(pressure);

    // 1. Add raw point to engine to get smoothed point
    // We don't use the raw (x,y) for drawing directly, we use the smoothed result
    const point = this.engine.addPoint({ x, y, pressure: mappedPressure });

    // 2. Interpolate between lastSmoothedPoint and new smoothed point
    const dx = point.x - this.lastSmoothedPoint.x;
    const dy = point.y - this.lastSmoothedPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate step size based on brush size and spacing
    // We use the pressure-adjusted size at the *start* of the segment to approximate
    const startSize = this.size * this.lastSmoothedPoint.pressure;
    const step = Math.max(1, startSize * this.spacing);

    // 3. Fill gaps
    let currentDist = this.leftoverDistance;

    while (currentDist <= distance) {
      const t = currentDist / distance; // Normalized position (0 to 1)

      const interpolatedPoint = {
        x: this.lastSmoothedPoint.x + dx * t,
        y: this.lastSmoothedPoint.y + dy * t,
        pressure: this.lastSmoothedPoint.pressure + (point.pressure - this.lastSmoothedPoint.pressure) * t
      };

      this.drawDot(ctx, interpolatedPoint);

      currentDist += step;
    }

    this.leftoverDistance = currentDist - distance;
    this.lastSmoothedPoint = point;
  }

  private drawDot(ctx: ToolContext, point: Point) {
    const { ctx: layerCtx } = ctx;
    const store = useEdgelessStore.getState();

    // Calculate effective size with pressure and jitter
    let effectiveSize = this.size * point.pressure;
    if (this.sizeJitter > 0) {
      effectiveSize *= 1 + (Math.random() - 0.5) * (this.sizeJitter / 50);
    }

    // Scatter
    let finalX = point.x;
    let finalY = point.y;
    if (this.scatter > 0) {
      const scatterAmount = this.scatter / 100 * this.size;
      finalX += (Math.random() - 0.5) * scatterAmount;
      finalY += (Math.random() - 0.5) * scatterAmount;
    }

    // Blend
    if (this.blend > 0) {
      layerCtx.globalAlpha = 1 - (this.blend / 200);
    }

    layerCtx.beginPath();
    // Draw a circle for the dab
    layerCtx.arc(finalX, finalY, effectiveSize / 2, 0, Math.PI * 2);
    layerCtx.fillStyle = store.penColor;
    layerCtx.fill();

    if (this.blend > 0) {
      layerCtx.globalAlpha = 1;
    }
  }

  onEnd() {
    this.isDrawing = false;
  }

  /** map input pressure through cubic bezier curve */
  private applyPressureCurve(pressure: number): number {
    const [x1, y1, x2, y2] = this.pressureCurve;
    // simple cubic bezier approximation (t = pressure)
    const t = Math.max(0, Math.min(1, pressure));
    const mt = 1 - t;
    return 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t;
  }
}
