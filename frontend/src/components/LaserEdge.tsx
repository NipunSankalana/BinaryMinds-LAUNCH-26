import React from 'react';
import { BaseEdge, getSimpleBezierPath } from 'reactflow';
import type { EdgeProps } from 'reactflow';

export const LaserEdge: React.FC<EdgeProps> = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) => {
  const [edgePath] = getSimpleBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isActive = data?.isActive;
  const isKilled = data?.isKilled;

  return (
    <>
      {/* Glow vector pipeline background */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: isKilled 
            ? 'rgba(255, 51, 102, 0.08)' 
            : isActive 
            ? 'rgba(245, 158, 11, 0.2)' 
            : 'rgba(0, 242, 254, 0.06)',
          strokeWidth: isActive ? 6 : 3,
          ...style,
        }}
      />
      
      {/* Main Core laser line */}
      <path
        d={edgePath}
        fill="none"
        stroke={isKilled 
          ? '#ff3366' 
          : isActive 
          ? '#f59e0b' 
          : 'rgba(0, 242, 254, 0.3)'}
        strokeWidth={isActive ? 2 : 1}
        strokeDasharray={isKilled ? '4 4' : undefined}
        style={{
          transition: 'stroke 0.4s ease, stroke-width 0.4s ease',
        }}
      />

      {/* Laser Pulse Stream */}
      {isActive && !isKilled && (
        <path
          d={edgePath}
          fill="none"
          stroke="#05ffb0"
          strokeWidth={2}
          strokeDasharray="6, 20"
          className="laser-beam"
        />
      )}
    </>
  );
};
