import React from 'react';
import { ValidationResult, ValidationIssue, ValidationSeverity, EditorReferenceData } from '@quodsi/shared';
import { AlertTriangle, XCircle, Info, CheckCircle, Activity, Users, Package, Zap } from 'lucide-react';

interface ValidationDashboardProps {
  validationState: ValidationResult | null;
  referenceData?: EditorReferenceData;
}

/**
 * Comprehensive validation dashboard shown in ModelEditor
 * Groups and displays all validation issues
 */
export const ValidationDashboard: React.FC<ValidationDashboardProps> = ({
  validationState,
  referenceData
}) => {
  // Group issues by severity
  const groupIssuesBySeverity = () => {
    if (!validationState?.issues) {
      return { errors: [], warnings: [], info: [] };
    }

    const errors = validationState.issues.filter(i => i.severity === ValidationSeverity.ERROR);
    const warnings = validationState.issues.filter(i => i.severity === ValidationSeverity.WARNING);
    const info = validationState.issues.filter(i => i.severity === ValidationSeverity.INFO);

    return { errors, warnings, info };
  };

  const { errors, warnings, info } = groupIssuesBySeverity();
  const totalIssues = errors.length + warnings.length + info.length;

  // Render summary cards
  const renderSummaryCards = () => {
    const isValid = validationState?.summary?.errorCount === 0;

    return (
      <div className="grid grid-cols-3 gap-2 mb-4">
        {/* Errors Card */}
        <div className="bg-red-50 border border-red-200 rounded p-3 text-center">
          <div className="flex items-center justify-center mb-1">
            <XCircle className="h-5 w-5 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-700">{errors.length}</div>
          <div className="text-xs text-red-600 font-medium">Errors</div>
        </div>

        {/* Warnings Card */}
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-center">
          <div className="flex items-center justify-center mb-1">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          </div>
          <div className="text-2xl font-bold text-yellow-700">{warnings.length}</div>
          <div className="text-xs text-yellow-600 font-medium">Warnings</div>
        </div>

        {/* Status Card */}
        <div className={`${isValid ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} border rounded p-3 text-center`}>
          <div className="flex items-center justify-center mb-1">
            {isValid ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <Info className="h-5 w-5 text-gray-600" />
            )}
          </div>
          <div className="text-2xl font-bold text-gray-700">{info.length}</div>
          <div className="text-xs text-gray-600 font-medium">Info</div>
        </div>
      </div>
    );
  };

  // Render validation issue
  const renderValidationIssue = (issue: ValidationIssue, index: number) => {
    const getIssueStyle = (severity: ValidationSeverity) => {
      switch (severity) {
        case ValidationSeverity.ERROR:
          return {
            container: 'bg-red-50 border-l-4 border-red-500 p-3 mb-2 rounded-r shadow-sm',
            icon: <XCircle className="h-4 w-4 text-red-500" />,
            text: 'text-red-800 font-medium',
            badge: 'bg-red-100 text-red-700',
          };
        case ValidationSeverity.WARNING:
          return {
            container: 'bg-yellow-50 border-l-4 border-yellow-500 p-3 mb-2 rounded-r shadow-sm',
            icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
            text: 'text-yellow-800 font-medium',
            badge: 'bg-yellow-100 text-yellow-700',
          };
        case ValidationSeverity.INFO:
        default:
          return {
            container: 'bg-blue-50 border-l-4 border-blue-500 p-3 mb-2 rounded-r shadow-sm',
            icon: <Info className="h-4 w-4 text-blue-500" />,
            text: 'text-blue-800 font-medium',
            badge: 'bg-blue-100 text-blue-700',
          };
      }
    };

    const style = getIssueStyle(issue.severity);

    return (
      <div key={`validation-issue-${index}`} className={style.container}>
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${style.text} leading-snug mb-1`}>{issue.message}</p>
            {issue.elementId && (
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${style.badge}`}>
                  {issue.elementId}
                </span>
              </div>
            )}
            {issue.code && (
              <div className="text-xs text-gray-500 mt-1">
                Code: {issue.code}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render issue group
  const renderIssueGroup = (issues: ValidationIssue[], title: string, icon: React.ReactNode, colorClass: string) => {
    if (issues.length === 0) return null;

    return (
      <div className="mb-4">
        <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${colorClass}`}>
          {icon}
          <h3 className="text-sm font-semibold text-gray-800">
            {title} ({issues.length})
          </h3>
        </div>
        <div className="space-y-1">
          {issues.map((issue, index) => renderValidationIssue(issue, index))}
        </div>
      </div>
    );
  };

  // Render model statistics
  const renderModelStats = () => {
    if (!referenceData) return null;

    const stats = [
      { label: 'Activities', count: referenceData.activities?.length || 0, icon: <Activity className="h-3 w-3" /> },
      { label: 'Resources', count: referenceData.resources?.length || 0, icon: <Users className="h-3 w-3" /> },
      { label: 'Entities', count: referenceData.entities?.length || 0, icon: <Package className="h-3 w-3" /> },
    ];

    return (
      <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Model Components</h4>
        <div className="grid grid-cols-3 gap-2">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="flex items-center justify-center mb-1 text-gray-600">
                {stat.icon}
              </div>
              <div className="text-lg font-bold text-gray-800">{stat.count}</div>
              <div className="text-xs text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // If no validation state, show placeholder
  if (!validationState) {
    return (
      <div className="p-4">
        <div className="text-center py-8 bg-gray-50 rounded border border-gray-200">
          <Info className="h-8 w-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">No validation results available</p>
          <p className="text-xs text-gray-500 mt-1">Click "Validate Model" to check for issues</p>
        </div>
      </div>
    );
  }

  // If model is valid with no issues
  if (totalIssues === 0) {
    return (
      <div className="p-4">
        {renderModelStats()}
        {renderSummaryCards()}

        <div className="text-center py-8 bg-green-50 rounded border-2 border-green-200">
          <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-3" />
          <h3 className="text-lg font-semibold text-green-800 mb-1">Model is Valid</h3>
          <p className="text-sm text-green-700">No validation issues found</p>
          <p className="text-xs text-green-600 mt-2">Your model is ready for simulation</p>
        </div>
      </div>
    );
  }

  // Show validation issues grouped by severity
  return (
    <div className="p-4">
      {renderModelStats()}
      {renderSummaryCards()}

      <div className="space-y-4">
        {renderIssueGroup(
          errors,
          'Errors',
          <XCircle className="h-4 w-4 text-red-600" />,
          'border-red-200'
        )}

        {renderIssueGroup(
          warnings,
          'Warnings',
          <AlertTriangle className="h-4 w-4 text-yellow-600" />,
          'border-yellow-200'
        )}

        {renderIssueGroup(
          info,
          'Information',
          <Info className="h-4 w-4 text-blue-600" />,
          'border-blue-200'
        )}
      </div>

      {/* Summary footer */}
      <div className="mt-4 pt-4 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-600">
          Found {totalIssues} issue{totalIssues !== 1 ? 's' : ''} across the model
        </p>
      </div>
    </div>
  );
};
