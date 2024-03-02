import { focusTo } from "./matrix";

export type FocusPoint = "center" | "top-left";

export default function getFocusedMatrix(focusPoint: FocusPoint, width: number, height: number) {
  switch (focusPoint) {
    case "center":
      return focusTo(new DOMMatrix(), { x: 0, y: 0 }, width, height, 1);
    case "top-left":
      return focusTo(new DOMMatrix(), { x: 0, y: 0 }, 0, 0, 1);
  }
}
