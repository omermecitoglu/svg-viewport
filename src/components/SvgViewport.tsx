import React, { type ComponentProps, type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import getFocusedMatrix, { type FocusPoint } from "../core/initial-focus";
import { adjustWithZoom, transform } from "../core/matrix";
import { usePolyfillState } from "../hooks/polyfill-state";
import type { Point } from "../types/point";
import type { ViewportTransform } from "../types/viewport";

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
   * Indicates if panning is currently active.
   */
  panning?: boolean,
  /**
   * Setter for the panning state.
   */
  setPanning?: Dispatch<SetStateAction<boolean>>,
  /**
   * Current transformation state.
   */
  transformation?: ViewportTransform | null,
  /**
   * Setter for the transformation state.
   */
  setTransformation?: Dispatch<SetStateAction<ViewportTransform | null>>,
  /**
   * Initial focus point of the viewport.
   */
  initialFocusPoint?: FocusPoint,
};

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
  panning = false,
  setPanning,
  transformation = null,
  setTransformation,
  initialFocusPoint = "center",
  style,
  children,
  ...otherProps
}: SvgViewportProps) => {
  const pointer = useRef<Point>({ x: 0, y: 0 });
  const [grabbing, setGrabbing] = useState(false);
  const [activeTransformation, activeSetTransformation] = usePolyfillState(transformation, setTransformation);
  const [activePanning, setActivePanning] = usePolyfillState(panning, setPanning);

  const stopGrabbing = () => {
    setGrabbing(false);
  };

  useEffect(() => {
    if (setTransformation) return;
    activeSetTransformation({
      zoom: 1,
      matrix: getFocusedMatrix(initialFocusPoint, width, height),
    });
  }, [setTransformation]);

  // panning

  const down = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 0) {
      pointer.current = {
        x: e.clientX,
        y: e.clientY,
      };
      setActivePanning(true);
    }
    setGrabbing(true);
  };

  const move = useCallback((e: MouseEvent) => {
    if (activePanning && activeTransformation) {
      const x = (e.clientX - pointer.current.x) / activeTransformation.zoom;
      const y = (e.clientY - pointer.current.y) / activeTransformation.zoom;
      pointer.current = {
        x: e.clientX,
        y: e.clientY,
      };
      activeSetTransformation(t => (t ? { ...t, matrix: t.matrix.translate(x, y) } : t));
    }
  }, [activePanning, activeTransformation]);

  const up = useCallback(() => {
    setActivePanning(false);
  }, []);

  useEffect(() => {
    if (activePanning) {
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    }
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
  }, [activePanning]);

  // zooming

  const adjustZoom = (e: React.WheelEvent<SVGSVGElement>) => {
    const scale = e.deltaY < 0 ? 1.25 : 0.8;
    const eventTarget = e.currentTarget;
    const eventClientX = e.clientX;
    const eventClientY = e.clientY;
    activeSetTransformation(t => {
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

  const cursor = pannable ? ((grabbing || panning) ? "grabbing" : "grab") : "auto";

  return (
    <svg
      width={width}
      height={height}
      onMouseDown={pannable ? down : undefined}
      onMouseUp={pannable ? stopGrabbing : undefined}
      onMouseLeave={pannable ? stopGrabbing : undefined}
      onWheel={zoomable ? adjustZoom : undefined}
      onContextMenu={e => e.preventDefault()}
      style={{ ...style, cursor }}
      {...otherProps}
    >
      <g transform={transform(activeTransformation?.matrix)}>
        {activeTransformation && children}
      </g>
    </svg>
  );
};

export default SvgViewport;
