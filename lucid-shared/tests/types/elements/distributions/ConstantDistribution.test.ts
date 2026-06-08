import { DistributionType } from '@quodsi/shared';
import {
    ConstantParameters,
    ConstantDistribution
} from '@quodsi/shared';

describe('ConstantDistribution', () => {
    describe('createDefault', () => {
        it('should create a distribution with default parameters', () => {
            const distribution = ConstantDistribution.createDefault();
            
            expect(distribution.distributionType).toBe(DistributionType.CONSTANT);
            expect((distribution.parameters as ConstantParameters).value).toBe(1);
        });
    });
    
    describe('create', () => {
        it('should create a distribution with the specified value', () => {
            const distribution = ConstantDistribution.create(5);
            
            expect(distribution.distributionType).toBe(DistributionType.CONSTANT);
            expect((distribution.parameters as ConstantParameters).value).toBe(5);
        });
    });
    
    describe('validateParameters', () => {
        it('should return true for valid parameters', () => {
            expect(ConstantDistribution.validateParameters({ value: 0 })).toBe(true);
            expect(ConstantDistribution.validateParameters({ value: 5 })).toBe(true);
        });
        
        it('should return false for invalid parameters', () => {
            expect(ConstantDistribution.validateParameters({ value: -1 })).toBe(false);
            expect(ConstantDistribution.validateParameters({ value: NaN })).toBe(false);
            
            // @ts-ignore - Testing with invalid parameter type
            expect(ConstantDistribution.validateParameters({ value: "5" })).toBe(false);
            
            // @ts-ignore - Testing with missing value
            expect(ConstantDistribution.validateParameters({})).toBe(false);
        });
    });
    
    describe('getEffectiveValue', () => {
        it('should return the value parameter', () => {
            expect(ConstantDistribution.getEffectiveValue({ value: 5 })).toBe(5);
            expect(ConstantDistribution.getEffectiveValue({ value: 0 })).toBe(0);
        });
    });
});
