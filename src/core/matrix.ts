export function transform({ a, b, c, d, e, f }: DOMMatrix) {
  return `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`;
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
