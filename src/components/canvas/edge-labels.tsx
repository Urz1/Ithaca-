"use client";

import { useRegisterEvents, useSigma } from "@react-sigma/core";
import { useEffect, useState } from "react";
import {
  CheckCircle,
  XCircle,
  ArrowRightCircle,
  AlertTriangle,
  Link2,
} from "lucide-react";

interface EdgeLabelData {
  visible: boolean;
  edgeType: "supports" | "contradicts" | "extends" | "cites" | "unknown";
  confidence: number;
  x: number;
  y: number;
}

const initialState: EdgeLabelData = {
  visible: false,
  edgeType: "supports",
  confidence: 0,
  x: 0,
  y: 0,
};

/**
 * Edge labels that appear when hovering near edges
 * Shows the relationship type (supports/contradicts/extends) with confidence %
 */
export function EdgeLabels() {
  const registerEvents = useRegisterEvents();
  const sigma = useSigma();
  const [label, setLabel] = useState<EdgeLabelData>(initialState);

  useEffect(() => {
    registerEvents({
      enterEdge: (event) => {
        const edgeData = sigma.getGraph().getEdgeAttributes(event.edge);
        const source = sigma.getGraph().source(event.edge);
        const target = sigma.getGraph().target(event.edge);

        // Get node positions to calculate edge midpoint
        const sourcePos = sigma.getNodeDisplayData(source);
        const targetPos = sigma.getNodeDisplayData(target);

        if (sourcePos && targetPos) {
          // Convert graph coordinates to screen coordinates
          const sourceScreen = sigma.graphToViewport(sourcePos);
          const targetScreen = sigma.graphToViewport(targetPos);

          // Calculate midpoint
          const midX = (sourceScreen.x + targetScreen.x) / 2;
          const midY = (sourceScreen.y + targetScreen.y) / 2;

          setLabel({
            visible: true,
            edgeType: edgeData.edgeType || "supports",
            confidence: edgeData.confidence || 85,
            x: midX,
            y: midY,
          });
        }
      },
      leaveEdge: () => {
        setLabel((prev) => ({ ...prev, visible: false }));
      },
    });
  }, [registerEvents, sigma]);

  if (!label.visible) return null;

  const config = {
    supports: {
      icon: CheckCircle,
      color: "text-supports",
      bgColor: "bg-supports/10",
      borderColor: "border-supports/30",
      label: "Supports",
    },
    contradicts: {
      icon: XCircle,
      color: "text-contradicts",
      bgColor: "bg-contradicts/10",
      borderColor: "border-contradicts/30",
      label: "Refutes",
    },
    extends: {
      icon: ArrowRightCircle,
      color: "text-extends",
      bgColor: "bg-extends/10",
      borderColor: "border-extends/30",
      label: "Extends",
    },
    unknown: {
      icon: AlertTriangle,
      color: "text-muted-foreground",
      bgColor: "bg-muted/20",
      borderColor: "border-muted-foreground/30",
      label: "Unknown",
    },
    cites: {
      icon: Link2,
      color: "text-muted-foreground",
      bgColor: "bg-muted/10",
      borderColor: "border-muted-foreground/20",
      label: "Cites",
    },
  };

  const typeConfig = config[label.edgeType] || config.unknown;
  const Icon = typeConfig.icon;

  return (
    <div
      className="animate-in fade-in zoom-in-95 pointer-events-none fixed z-50 duration-150"
      style={{
        left: label.x,
        top: label.y,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div
        className={`${typeConfig.bgColor} border ${typeConfig.borderColor} flex items-center gap-1.5 rounded px-2 py-1 shadow-lg backdrop-blur-sm`}
      >
        <Icon className={`${typeConfig.color} h-3.5 w-3.5`} />
        <span
          className={`${typeConfig.color} font-mono text-xs font-bold tracking-tight`}
        >
          {typeConfig.label} ({label.confidence}%)
        </span>
      </div>
    </div>
  );
}
