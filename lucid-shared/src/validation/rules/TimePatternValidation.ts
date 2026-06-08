import { ValidationRule } from '../common/ValidationRule';
import { ModelDefinitionState } from "../models/ModelDefinitionState";
import { ValidationMessages } from '../common/ValidationMessages';
import { ValidationIssue, ValidationSeverity } from "../../quodsi-messaging/validation/types";
import { TimePattern } from '@quodsi/shared';

export class TimePatternValidation extends ValidationRule {
    validate(state: ModelDefinitionState, issues: ValidationIssue[]): void {
        const patterns = state.modelDefinition.timePatterns.getAll();

        patterns.forEach((pattern: TimePattern) => {
            this.validateTimePatternData(pattern, issues);
        });
    }

    private validateTimePatternData(
        pattern: TimePattern,
        issues: ValidationIssue[]
    ): void {
        this.log(`Starting validation for TimePattern ID: ${pattern.id}, Name: ${pattern.name}`);

        // Validate the pattern's name
        if (!pattern.name || pattern.name.trim().length === 0) {
            this.log(`Validation failed: TimePattern ID ${pattern.id} has an empty or missing name.`);
            issues.push(ValidationMessages.missingName('TimePattern', pattern.id, pattern.name));
        }

        // Validate weekly weights (must be exactly 52 if provided)
        if (pattern.weeklyWeights && pattern.weeklyWeights.length > 0) {
            if (pattern.weeklyWeights.length !== 52) {
                this.log(`Validation failed: TimePattern ID ${pattern.id} has invalid weekly_weights length (${pattern.weeklyWeights.length}).`);
                issues.push(ValidationMessages.createIssue(
                    ValidationSeverity.ERROR,
                    'time_pattern_weekly_weights',
                    `TimePattern '${pattern.name}' weekly_weights must contain exactly 52 values (ISO weeks 1-52), got ${pattern.weeklyWeights.length}`,
                    pattern.id
                ));
            }

            // Check for non-negative weights
            const negativeWeights = pattern.weeklyWeights.filter(w => w < 0);
            if (negativeWeights.length > 0) {
                this.log(`Validation failed: TimePattern ID ${pattern.id} has negative weekly weights.`);
                issues.push(ValidationMessages.createIssue(
                    ValidationSeverity.ERROR,
                    'time_pattern_negative_weights',
                    `TimePattern '${pattern.name}' weekly_weights must be non-negative`,
                    pattern.id
                ));
            }
        }

        // Validate day-of-week weights (must be exactly 7 if provided)
        if (pattern.dayOfWeekWeights && pattern.dayOfWeekWeights.length > 0) {
            if (pattern.dayOfWeekWeights.length !== 7) {
                this.log(`Validation failed: TimePattern ID ${pattern.id} has invalid day_of_week_weights length (${pattern.dayOfWeekWeights.length}).`);
                issues.push(ValidationMessages.createIssue(
                    ValidationSeverity.ERROR,
                    'time_pattern_day_of_week_weights',
                    `TimePattern '${pattern.name}' day_of_week_weights must contain exactly 7 values (Monday-Sunday), got ${pattern.dayOfWeekWeights.length}`,
                    pattern.id
                ));
            }

            const negativeWeights = pattern.dayOfWeekWeights.filter(w => w < 0);
            if (negativeWeights.length > 0) {
                this.log(`Validation failed: TimePattern ID ${pattern.id} has negative day-of-week weights.`);
                issues.push(ValidationMessages.createIssue(
                    ValidationSeverity.ERROR,
                    'time_pattern_negative_weights',
                    `TimePattern '${pattern.name}' day_of_week_weights must be non-negative`,
                    pattern.id
                ));
            }
        }

        // Validate day-of-week-hour weights (must be exactly 168 if provided)
        if (pattern.dayOfWeekHourWeights && pattern.dayOfWeekHourWeights.length > 0) {
            if (pattern.dayOfWeekHourWeights.length !== 168) {
                this.log(`Validation failed: TimePattern ID ${pattern.id} has invalid day_of_week_hour_weights length (${pattern.dayOfWeekHourWeights.length}).`);
                issues.push(ValidationMessages.createIssue(
                    ValidationSeverity.ERROR,
                    'time_pattern_day_of_week_hour_weights',
                    `TimePattern '${pattern.name}' day_of_week_hour_weights must contain exactly 168 values (7 days × 24 hours), got ${pattern.dayOfWeekHourWeights.length}`,
                    pattern.id
                ));
            }

            const negativeWeights = pattern.dayOfWeekHourWeights.filter(w => w < 0);
            if (negativeWeights.length > 0) {
                this.log(`Validation failed: TimePattern ID ${pattern.id} has negative hourly weights.`);
                issues.push(ValidationMessages.createIssue(
                    ValidationSeverity.ERROR,
                    'time_pattern_negative_weights',
                    `TimePattern '${pattern.name}' day_of_week_hour_weights must be non-negative`,
                    pattern.id
                ));
            }
        }

        this.log(`Completed validation for TimePattern ID: ${pattern.id}`);
    }
}
