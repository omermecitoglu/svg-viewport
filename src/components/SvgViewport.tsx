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
   * Current transformation state of the viewport.
   */
  transformation?: ViewportTransformation | null,
  /**
   * Callback to update the transformation state.
   */
  onTransformationChange?: (tranformation: ViewportTransformation) => void,
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
  transformation: externalTransformation,
  onTransformationChange,
  initialFocusPoint = "center",
  style,
  children,
  ...otherProps
}: SvgViewportProps) => {
  const isControlled = externalTransformation !== undefined;

  const [internalTransformation, setInternalTransformation] = useState<ViewportTransformation | null>(() => {
    if (isControlled) return null;
    return {
      zoom: 1,
      matrix: getFocusedMatrix(initialFocusPoint, width, height),
    };
  });

  const transformation = isControlled ? externalTransformation : internalTransformation;

  const transformationRef = useRef(transformation);
  useEffect(() => {
    transformationRef.current = transformation;
  }, [transformation]);

  const pointer = useRef<Point>({ x: 0, y: 0 });
  const [grabbing, setGrabbing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const setTransformation = useCallback((value: ViewportTransformation) => {
    if (!isControlled) {
      setInternalTransformation(value);
    }
    onTransformationChange?.(value);
  }, [isControlled, onTransformationChange]);

  const stopGrabbing = () => {
    setGrabbing(false);
  };

  // --- PANNING ---

  const down = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    pointer.current = { x: e.clientX, y: e.clientY };
    setIsPanning(true);
    setGrabbing(true);
  };

  const move = useCallback((e: MouseEvent) => {
    const currentTrans = transformationRef.current;

    if (currentTrans) {
      const x = (e.clientX - pointer.current.x) / currentTrans.zoom;
      const y = (e.clientY - pointer.current.y) / currentTrans.zoom;

      pointer.current = { x: e.clientX, y: e.clientY };

      setTransformation({
        ...currentTrans,
        matrix: currentTrans.matrix.translate(x, y),
      });
    }
  }, [setTransformation]);

  const up = useCallback(() => {
    setIsPanning(false);
    setGrabbing(false);
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
  }, [isPanning, move, up]);


  // --- ZOOMING ---

  const adjustZoom = (e: React.WheelEvent<SVGSVGElement>) => {
    if (!zoomable) return;

    e.preventDefault();

    const scale = e.deltaY < 0 ? 1.25 : 0.8;
    const eventTarget = e.currentTarget;
    const { clientX, clientY } = e;

    if (transformation && transformation.zoom * scale > minZoom && transformation.zoom * scale < maxZoom) {
      setTransformation({
        zoom: transformation.zoom * scale,
        matrix: adjustWithZoom(transformation.matrix, scale, eventTarget, clientX, clientY),
      });
    }
  };

  const cursor = pannable ? (grabbing ? "grabbing" : "grab") : "auto";

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
      <g transform={transform(transformation?.matrix)}>
        {transformation && children}
      </g>
    </svg>
  );
};

export default SvgViewport;
