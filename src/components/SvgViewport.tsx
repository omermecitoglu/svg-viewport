import React, { type Dispatch, type ReactNode, type SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import type { Point } from "~/types/point";
import type { ViewportTransform } from "~/types/viewport";
import { adjustWithZoom, transform } from "../core/matrix";

export type SvgViewportProps = {
  width: number,
  height: number,
  pannable: boolean,
  zoomable: boolean,
  minZoom: number,
  maxZoom: number,
  panning: boolean,
  setPanning: (status: boolean) => void,
  transformation: ViewportTransform | null,
  setTransformation: Dispatch<SetStateAction<ViewportTransform | null>>,
  className?: string,
  children: ReactNode,
};

const SvgViewport = ({
  width,
  height,
  pannable,
  zoomable,
  minZoom,
  maxZoom,
  panning,
  setPanning,
  transformation,
  setTransformation,
  className,
  children,
}: SvgViewportProps) => {
  const [grabbing, setGrabbing] = useState(false);
  const pointer = useRef<Point>({ x: 0, y: 0 });

  const stopGrabbing = () => {
    setGrabbing(false);
  };

  // panning

  const down = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 0) {
      pointer.current = {
        x: e.clientX,
        y: e.clientY,
      };
      setPanning(true);
    }
    setGrabbing(true);
  };

  const move = useCallback((e: MouseEvent) => {
    if (panning && transformation) {
      const x = (e.clientX - pointer.current.x) / transformation.zoom;
      const y = (e.clientY - pointer.current.y) / transformation.zoom;
      pointer.current = {
        x: e.clientX,
        y: e.clientY,
      };
      setTransformation(t => (t ? { ...t, matrix: t.matrix.translate(x, y) } : t));
    }
  }, [panning, transformation]);

  const up = useCallback(() => {
    setPanning(false);
  }, []);

  useEffect(() => {
    if (panning) {
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    }
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
  }, [panning]);

  // zooming

  const adjustZoom = (e: React.WheelEvent<SVGSVGElement>) => {
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
      className={className}
      style={{ cursor }}
    >
      <g transform={transformation ? transform(transformation.matrix) : undefined}>
        {transformation && children}
      </g>
    </svg>
  );
};

export default SvgViewport;
