import { ValidationRule } from '../common/ValidationRule';
import { ModelDefinitionState } from "../models/ModelDefinitionState";
import { ValidationMessages } from '../common/ValidationMessages';
import { ValidationIssue, ValidationSeverity } from "../../quodsi-messaging/validation/types";
import { TimeDistributedConfig } from '@quodsi/shared';

export class TimeDistributedConfigValidation extends ValidationRule {
    validate(state: ModelDefinitionState, issues: ValidationIssue[]): void {
        const configs = state.modelDefinition.timeDistributedConfigs.getAll();

        configs.forEach((config: TimeDistributedConfig) => {
            this.validateTimeDistributedConfigData(config, state, issues);
        });
    }

    private validateTimeDistributedConfigData(
        config: TimeDistributedConfig,
        state: ModelDefinitionState,
        issues: ValidationIssue[]
    ): void {
        this.log(`Starting validation for TimeDistributedConfig ID: ${config.id}, Name: ${config.name}`);

        // Validate the config's name
        if (!config.name || config.name.trim().length === 0) {
            this.log(`Validation failed: TimeDistributedConfig ID ${config.id} has an empty or missing name.`);
            issues.push(ValidationMessages.missingName('TimeDistributedConfig', config.id, config.name));
        }

        // Validate time pattern reference
        if (!config.timePatternId || config.timePatternId.trim().length === 0) {
            this.log(`Validation failed: TimeDistributedConfig ID ${config.id} does not specify a time_pattern_id.`);
            issues.push(ValidationMessages.createIssue(
                ValidationSeverity.ERROR,
                'time_distributed_config_pattern_ref',
                `TimeDistributedConfig '${config.name}' must reference a valid TimePattern`,
                config.id
            ));
        } else {
            const patternExists = state.modelDefinition.timePatterns.get(config.timePatternId);
            if (!patternExists) {
                this.log(`Validation failed: TimeDistributedConfig ID ${config.id} references non-existent pattern (${config.timePatternId}).`);
                issues.push(ValidationMessages.createIssue(
                    ValidationSeverity.ERROR,
                    'time_distributed_config_pattern_ref',
                    `TimeDistributedConfig '${config.name}' references non-existent TimePattern '${config.timePatternId}'`,
                    config.id
                ));
            }
        }

        // Validate total volume
        if (typeof config.totalVolume !== 'number' || config.totalVolume < 0) {
            this.log(`Validation failed: TimeDistributedConfig ID ${config.id} has invalid total_volume (${config.totalVolume}).`);
            issues.push(ValidationMessages.createIssue(
                ValidationSeverity.ERROR,
                'time_distributed_config_total_volume',
                `TimeDistributedConfig '${config.name}' total_volume must be non-negative`,
                config.id
            ));
        }

        // Validate start_date format (ISO 8601: YYYY-MM-DD)
        if (!config.startDate || !this.isValidISODate(config.startDate)) {
            this.log(`Validation failed: TimeDistributedConfig ID ${config.id} has invalid start_date (${config.startDate}).`);
            issues.push(ValidationMessages.createIssue(
                ValidationSeverity.ERROR,
                'time_distributed_config_start_date',
                `TimeDistributedConfig '${config.name}' start_date must be valid ISO 8601 format (YYYY-MM-DD)`,
                config.id
            ));
        }

        // Validate end_date format (ISO 8601: YYYY-MM-DD)
        if (!config.endDate || !this.isValidISODate(config.endDate)) {
            this.log(`Validation failed: TimeDistributedConfig ID ${config.id} has invalid end_date (${config.endDate}).`);
            issues.push(ValidationMessages.createIssue(
                ValidationSeverity.ERROR,
                'time_distributed_config_end_date',
                `TimeDistributedConfig '${config.name}' end_date must be valid ISO 8601 format (YYYY-MM-DD)`,
                config.id
            ));
        }

        // Validate end_date > start_date
        if (config.startDate && config.endDate && this.isValidISODate(config.startDate) && this.isValidISODate(config.endDate)) {
            const startDate = new Date(config.startDate);
            const endDate = new Date(config.endDate);

            if (endDate <= startDate) {
                this.log(`Validation failed: TimeDistributedConfig ID ${config.id} has end_date <= start_date.`);
                issues.push(ValidationMessages.createIssue(
                    ValidationSeverity.ERROR,
                    'time_distributed_config_date_range',
                    `TimeDistributedConfig '${config.name}' end_date must be after start_date`,
                    config.id
                ));
            }
        }

        this.log(`Completed validation for TimeDistributedConfig ID: ${config.id}`);
    }

    private isValidISODate(dateStr: string): boolean {
        // ISO 8601 date format: YYYY-MM-DD
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateStr)) {
            return false;
        }

        // Check if it's a valid date
        const date = new Date(dateStr);
        return date instanceof Date && !isNaN(date.getTime());
    }
}
