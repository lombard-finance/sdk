/**
 * StepIndicator - Compact horizontal progress showing current flow step
 *
 * Shows flow steps with visual indicators for completed, current, and upcoming steps.
 *
 * @module sdk-devtools/components/StepIndicator
 */

import { Check } from 'lucide-react';

import type { FlowStep } from '../types';

/**
 * Simple step definition (minimal required fields)
 */
export interface SimpleStep {
  id: string;
  label: string;
}

export interface StepIndicatorProps {
  /** Steps to display - can be simple { id, label } or full FlowStep */
  steps: SimpleStep[] | FlowStep[];

  /** Current step index (0-based) */
  currentStep: number;

  /** Custom class name */
  className?: string;
}

/**
 * Step Indicator Component
 *
 * Horizontal progress indicator showing completed, current, and upcoming steps.
 * Uses inline styles for sizing to avoid Tailwind v4 --spacing variable issues.
 * Steps have equal widths to align with the progress bar above.
 */
export function StepIndicator({
  steps,
  currentStep,
  className = '',
}: StepIndicatorProps) {
  return (
    <div
      className={`flex ${className}`}
      style={{
        width: '100%',
      }}
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isLast = index === steps.length - 1;

        // Determine colors for circle
        const circleStyles: React.CSSProperties = {
          width: '28px',
          height: '28px',
          minWidth: '28px',
          minHeight: '28px',
          borderRadius: '6px', // Slightly rounded corners
        };

        if (isCompleted) {
          circleStyles.backgroundColor = '#22c55e'; // green-500
          circleStyles.color = 'white';
        } else if (isCurrent) {
          circleStyles.backgroundColor = 'var(--lombard-green, #00E676)';
          circleStyles.color = '#111827'; // gray-900
          circleStyles.fontWeight = 'bold';
        } else {
          circleStyles.backgroundColor = '#e5e7eb'; // gray-200
          circleStyles.color = '#6b7280'; // gray-500
        }

        return (
          <div
            key={step.id}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            {/* Connector line - positioned absolutely */}
            {!isLast && (
              <div
                style={{
                  position: 'absolute',
                  top: '14px', // Half of circle height (28/2)
                  left: '50%',
                  right: '-50%',
                  height: '2px',
                  backgroundColor: isCompleted ? '#22c55e' : '#e5e7eb',
                  zIndex: 0,
                }}
              />
            )}

            {/* Step square with rounded corners */}
            <div
              className="flex items-center justify-center text-sm font-medium transition-colors"
              style={{
                ...circleStyles,
                position: 'relative',
                zIndex: 1,
              }}
            >
              {isCompleted ? (
                <Check style={{ width: '16px', height: '16px' }} />
              ) : (
                index + 1
              )}
            </div>

            {/* Label below circle */}
            <span
              className="text-xs text-center"
              style={{
                marginTop: '6px',
                color: isCompleted
                  ? '#16a34a' // green-600
                  : isCurrent
                    ? '#111827' // gray-900 (black for active)
                    : '#9ca3af', // gray-400
                fontWeight: isCompleted || isCurrent ? 500 : 400,
              }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Helper to convert simple step configs to FlowStep format
 */
export function createSteps(
  configs: Array<{ id: string; label: string; description?: string }>,
  currentStep: number,
): FlowStep[] {
  return configs.map((config, index) => ({
    ...config,
    status:
      index < currentStep
        ? 'completed'
        : index === currentStep
          ? 'current'
          : 'pending',
  }));
}
