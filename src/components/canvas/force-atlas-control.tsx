"use client";

import { useEffect, useState } from "react";
import { useWorkerLayoutForceAtlas2 } from "@react-sigma/layout-forceatlas2";
import { Play, Pause } from "lucide-react";
import { ANIMATION } from "@/lib/constants";

interface ForceAtlasControlProps {
  autoStart?: boolean;
  externalIsRunning?: boolean;
  onToggle?: () => void;
  nodeCount?: number;
}

export function ForceAtlasControl({
  autoStart = true,
  externalIsRunning,
  onToggle,
  nodeCount = 0,
}: ForceAtlasControlProps) {
  // Adaptive settings based on graph size
  const getOptimalSettings = (count: number) => {
    if (count > 10000) {
      // Large graphs: prioritize performance
      return {
        slowDown: 15,
        gravity: 2,
        scalingRatio: 2,
        barnesHutOptimize: true,
        barnesHutTheta: 0.8,
        adjustSizes: false,
        edgeWeightInfluence: 0,
        strongGravityMode: true,
      };
    } else if (count > 5000) {
      // Medium graphs: balance quality and performance
      return {
        slowDown: 12,
        gravity: 3,
        scalingRatio: 1.5,
        barnesHutOptimize: true,
        barnesHutTheta: 0.6,
        adjustSizes: true,
        edgeWeightInfluence: 0.5,
        strongGravityMode: true,
      };
    } else {
      // Small graphs: prioritize quality, keep compact
      return {
        slowDown: 10,
        gravity: 5,
        scalingRatio: 1,
        barnesHutOptimize: true,
        barnesHutTheta: 0.5,
        adjustSizes: true,
        edgeWeightInfluence: 1,
        strongGravityMode: true,
        linLogMode: false,
      };
    }
  };

  const { start, stop, kill, isRunning } = useWorkerLayoutForceAtlas2({
    settings: getOptimalSettings(nodeCount),
  });

  const [internalisActive, setInternalIsActive] = useState(autoStart);

  // Use external state if provided, otherwise internal
  const isActive =
    externalIsRunning !== undefined ? externalIsRunning : internalisActive;

  // Sync worker with state
  useEffect(() => {
    if (isActive && !isRunning) {
      start();
    } else if (!isActive && isRunning) {
      stop();
    }
  }, [isActive, isRunning, start, stop]);

  // Auto-start on mount, auto-stop after stabilization period
  useEffect(() => {
    start();
    const timeout = setTimeout(() => {
      stop();
      setInternalIsActive(false);
    }, ANIMATION.LAYOUT_STABILIZE);
    return () => {
      kill();
      clearTimeout(timeout);
    };
  }, [start, stop, kill]);

  const toggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalIsActive(!internalisActive);
    }
  };

  return (
    <div className="react-sigma-control">
      <button
        onClick={toggle}
        title={isActive ? "Stop Layout" : "Start Layout"}
        className="sigma-control-button sigma-control-button--svg"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "var(--sigma-controls-size, 36px)",
          height: "var(--sigma-controls-size, 36px)",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          padding: 0,
          margin: 0,
          color: "inherit",
        }}
      >
        {isActive ? (
          <Pause className="h-4 w-4" style={{ color: "var(--foreground)" }} />
        ) : (
          <Play className="h-4 w-4" style={{ color: "var(--foreground)" }} />
        )}
      </button>
    </div>
  );
}
