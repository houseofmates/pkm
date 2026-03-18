export interface Point {
  x: number;
  y: number;
  pressure: number;
}

export class StrokeEngine {
  private points: Point[] = [];
  private smoothing: number = 0.4;
  private pressureCurve: (p: number) => number = (p) => p;

  constructor(smoothing = 0.4) {
    this.smoothing = smoothing;
  }

  public setPressureCurve(points: [number, number][]) {
    // Basic linear interpolation for the curve points
    this.pressureCurve = (p) => {
      if (points.length < 2) return p;
      // Simple implementation: find segment and interpolate
      for (let i = 0; i < points.length - 1; i++) {
        if (p >= points[i][0] && p <= points[i+1][0]) {
          const t = (p - points[i][0]) / (points[i+1][0] - points[i][0]);
          return points[i][1] + t * (points[i+1][1] - points[i][1]);
        }
      }
      return p;
    };
  }

  public addPoint(point: Point): Point {
    const adjustedPressure = this.pressureCurve(point.pressure);
    const adjustedPoint = { ...point, pressure: adjustedPressure };

    const smoothedPoint = this.applySmoothing(adjustedPoint);
    this.points.push(smoothedPoint);
    return smoothedPoint;
  }

  private applySmoothing(point: Point): Point {
    // If we have at least two prior points, use a small 3-point weighted average (better curvature and pressure smoothing)
    if (this.points.length >= 2) {
      const a = this.points[this.points.length - 2];
      const b = this.points[this.points.length - 1];
      // Weighted average (gives more weight to the most recent point)
      return {
        x: (a.x + 2 * b.x + point.x) / 4,
        y: (a.y + 2 * b.y + point.y) / 4,
        pressure: (a.pressure + 2 * b.pressure + point.pressure) / 4,
      };
    }

    if (this.points.length === 0) return point;
    const lastPoint = this.points[this.points.length - 1];
    // Fallback to the original exponential smoothing for the very first sample
    return {
      x: lastPoint.x + (point.x - lastPoint.x) * (1 - this.smoothing),
      y: lastPoint.y + (point.y - lastPoint.y) * (1 - this.smoothing),
      pressure: lastPoint.pressure + (point.pressure - lastPoint.pressure) * (1 - this.smoothing),
    };
  }

  public clear() {
    this.points = [];
  }
}
