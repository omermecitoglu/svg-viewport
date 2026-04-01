import React, { type ComponentProps, useCallback, useEffect, useRef, useState } from "react";
import getFocusedMatrix, { type FocusPoint } from "../core/initial-focus";
import { adjustWithZoom, transform } from "../core/matrix";
import type { Point } from "../types/point";
import type { ViewportTransformation } from "../types/viewport";

/**
 * Props for the SvgViewport component.
 */
type SvgViewportProps = ComponentProps<"svg"> & {
  /**
   * Width of the SVG viewport.
   */
  width: number,
  /**
   * Height of the SVG viewport.
   */
  height: number,
  /**
   * Enable or disable panning functionality.
   */
  pannable?: boolean,
  /**
   * Optional bounds for panning. If provided, the viewport will be constrained within these limits when panning.
   */
  panningBounds?: {
    left?: number,
    top?: number,
    right?: number,
    bottom?: number,
  },
  /**
   * Enable or disable zooming functionality.
   */
  zoomable?: boolean,
  /**
   * Minimum zoom level.
   */
  minZoom?: number,
  /**
   * Maximum zoom level.
   */
  maxZoom?: number,
  /**
   * Initial focus point of the viewport.
   */
  initialFocusPoint?: FocusPoint,
  /**
   * Initial X coordinate for the viewport's transformation matrix (used when uncontrolled).
   */
  initialX?: number,
  /**
   * Initial Y coordinate for the viewport's transformation matrix (used when uncontrolled).
   */
  initialY?: number,
  /**
   * Initial zoom level of the viewport.
   */
  initialZoom?: number,
} & ({
  /**
   * Current transformation state of the viewport.
   */
  transformation: ViewportTransformation | null,
  /**
   * Callback to update the transformation state.
   */
  onTransformationChange?: React.Dispatch<React.SetStateAction<ViewportTransformation | null>>,
} | {
  /**
   * Current transformation state of the viewport.
   */
  transformation?: never,
  /**
   * Callback to observe the transformation state.
   */
  onTransformationChange?: (tranformation: ViewportTransformation) => void,
});

/**
 * SVG Viewport component that supports panning and zooming.
 */
const SvgViewport = ({
  width,
  height,
  pannable = false,
  panningBounds,
  zoomable = false,
  minZoom = 0.5,
  maxZoom = 2,
  transformation: externalTransformation,
  onTransformationChange,
  initialFocusPoint = "center",
  initialX = 0,
  initialY = 0,
  initialZoom = 1,
  style,
  children,
  ...otherProps
}: SvgViewportProps) => {
  const isControlled = externalTransformation !== undefined;
  const [internalTransformation, setInternalTransformation] = useState<ViewportTransformation | null>(null);
  const pointer = useRef<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const transformation = isControlled ? externalTransformation : internalTransformation;

  const setTransformation: typeof setInternalTransformation = input => {
    if (isControlled) {
      onTransformationChange?.(input);
    } else {
      setInternalTransformation(previousValue => {
        if (typeof input === "function") {
          const nextValue = input(previousValue);
          if (nextValue) {
            onTransformationChange?.(nextValue);
          }
          return nextValue;
        }
        if (input) {
          onTransformationChange?.(input);
        }
        return input;
      });
    }
  };

  const applyBounds = (matrix: DOMMatrix, bounds: SvgViewportProps["panningBounds"], zoom: number) => {
    if (!bounds) return matrix;
    if (bounds.left !== undefined) matrix.e = Math.min(-bounds.left * zoom, matrix.e);
    if (bounds.top !== undefined) matrix.f = Math.min(-bounds.top * zoom, matrix.f);
    if (bounds.right !== undefined) matrix.e = Math.max((-bounds.right * zoom) + width, matrix.e);
    if (bounds.bottom !== undefined) matrix.f = Math.max((-bounds.bottom * zoom) + height, matrix.f);
    return matrix;
  };

  useEffect(() => {
    const matrix = getFocusedMatrix(initialFocusPoint, width, height);
    matrix.e += -initialX;
    matrix.f += -initialY;
    setTransformation({ zoom: initialZoom, matrix });
  }, []);

  // panning

  const down = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 0) {
      pointer.current = {
        x: e.clientX,
        y: e.clientY,
      };
      setIsPanning(true);
    }
  };

  const move = useCallback((e: MouseEvent) => {
    if (!isPanning) return;
    if (!transformation) return;
    const x = (e.clientX - pointer.current.x) / transformation.zoom;
    const y = (e.clientY - pointer.current.y) / transformation.zoom;
    pointer.current = {
      x: e.clientX,
      y: e.clientY,
    };
    setTransformation(t => {
      if (!t) return t;
      return {
        ...t,
        matrix: applyBounds(t.matrix.translate(x, y), panningBounds, transformation.zoom),
      };
    });
  }, [isPanning, transformation?.zoom]);

  const up = useCallback(() => {
    setIsPanning(false);
  }, []);

  useEffect(() => {
    if (isPanning) {
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    }
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
  }, [isPanning]);

  // zooming

  const adjustZoom = (e: React.WheelEvent<SVGSVGElement>) => {
    /**
     * NOTE: e.preventDefault() is commented out due to "Passive Event Listener" violations.
     *
     * * THE PROBLEM:
     * Modern browsers treat 'wheel' events as passive by default to ensure smooth
     * page scrolling. Passive listeners disallow e.preventDefault().
     *
     * * WHAT WAS IT FIXING:
     * Preventing the default scroll behavior of the browser so the page stays still while the user zooms into the SVG content.
     *
     * * REACT LIMITATION:
     * React's synthetic event system (onWheel) does not currently provide a way
     * to set { passive: false } on the event listener.
     *
     * * THE REAL FIX:
     * If it becomes necessary somehow, this listener must be moved to a useEffect hook
     * using a manual ref and `addEventListener("wheel", listener, { passive: false })`.
     */
    // e.preventDefault(); // was causing an error (Unable to preventDefault inside passive event listener invocation)
    const scale = e.deltaY < 0 ? 1.25 : 0.8;
    const eventTarget = e.currentTarget;
    const eventClientX = e.clientX;
    const eventClientY = e.clientY;
    setTransformation(t => {
      if (t && t.zoom * scale > minZoom && t.zoom * scale < maxZoom) {
        return {
          ...t,
          zoom: t.zoom * scale,
          matrix: applyBounds(adjustWithZoom(t.matrix, scale, eventTarget, eventClientX, eventClientY), panningBounds, t.zoom * scale),
        };
      }
      return t;
    });
  };

  return (
    <svg
      width={width}
      height={height}
      onMouseDown={pannable ? down : undefined}
      onWheel={zoomable ? adjustZoom : undefined}
      onContextMenu={e => e.preventDefault()}
      style={{
        ...style,
        cursor: pannable ? (isPanning ? "grabbing" : "grab") : "auto",
      }}
      {...otherProps}
    >
      <g transform={transform(transformation?.matrix)}>
        {transformation && children}
      </g>
    </svg>
  );
};

export default SvgViewport;
