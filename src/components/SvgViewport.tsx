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
  zoomable = false,
  minZoom = 0.5,
  maxZoom = 2,
  transformation: externalTransformation,
  onTransformationChange,
  initialFocusPoint = "center",
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

  useEffect(() => {
    setTransformation({
      zoom: 1,
      matrix: getFocusedMatrix(initialFocusPoint, width, height),
    });
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
    if (isPanning && transformation) {
      const x = (e.clientX - pointer.current.x) / transformation.zoom;
      const y = (e.clientY - pointer.current.y) / transformation.zoom;
      pointer.current = {
        x: e.clientX,
        y: e.clientY,
      };
      setTransformation(t => (t ? { ...t, matrix: t.matrix.translate(x, y) } : t));
    }
  }, [isPanning, transformation]);

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
    e.preventDefault();
    const scale = e.deltaY < 0 ? 1.25 : 0.8;
    const eventTarget = e.currentTarget;
    const eventClientX = e.clientX;
    const eventClientY = e.clientY;
    setTransformation(t => {
      if (t && t.zoom * scale > minZoom && t.zoom * scale < maxZoom) {
        return {
          ...t,
          zoom: t.zoom * scale,
          matrix: adjustWithZoom(t.matrix, scale, eventTarget, eventClientX, eventClientY),
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
