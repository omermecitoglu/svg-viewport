import type { Point } from "~/types/point";

export function transform(matrix?: DOMMatrix) {
  if (!matrix) return undefined;
  const { a, b, c, d, e, f } = matrix;
  return `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`;
}

export function focusTo(matrix: DOMMatrix, { x, y }: Point, width: number, height: number, zoom: number) {
  return matrix.translate(
    ((width / 2) / zoom) - x - (matrix.m41 / zoom),
    ((height / 2) / zoom) - y - (matrix.m42 / zoom),
  );
}

export function adjustWithZoom(matrix: DOMMatrix, scale: number, svgElement: SVGSVGElement, eX: number, eY: number) {
  const rect = svgElement.getBoundingClientRect();
  const focusPoint = new DOMPoint(eX - rect.left, eY - rect.top);
  const relativePoint = focusPoint.matrixTransform(matrix.inverse());
  const modifier = new DOMMatrix()
    .translate(relativePoint.x, relativePoint.y)
    .scale(scale)
    .translate(-relativePoint.x, -relativePoint.y);
  return matrix.multiply(modifier);
}
