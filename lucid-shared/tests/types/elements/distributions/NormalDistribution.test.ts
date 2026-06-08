import { DistributionType } from '@quodsi/shared';
import {
    NormalParameters,
    NormalDistribution
} from '@quodsi/shared';

describe('NormalDistribution', () => {
    describe('createDefault', () => {
        it('should create a distribution with default parameters', () => {
            const distribution = NormalDistribution.createDefault();
            
            expect(distribution.distributionType).toBe(DistributionType.NORMAL);
            
            const params = distribution.parameters as NormalParameters;
            expect(params.mean).toBe(5);
            expect(params.std).toBe(1);
        });
    });
    
    describe('create', () => {
        it('should create a distribution with the specified parameters', () => {
            const distribution = NormalDistribution.create(3, 0.5);
            
            expect(distribution.distributionType).toBe(DistributionType.NORMAL);
            
            const params = distribution.parameters as NormalParameters;
            expect(params.mean).toBe(3);
            expect(params.std).toBe(0.5);
        });
    });
    
    describe('validateParameters', () => {
        it('should return true for valid parameters', () => {
            expect(NormalDistribution.validateParameters({ mean: 0, std: 1 })).toBe(true);
            expect(NormalDistribution.validateParameters({ mean: 5, std: 0.1 })).toBe(true);
        });
        
        it('should return false for invalid parameters', () => {
            // Mean is negative
            expect(NormalDistribution.validateParameters({ mean: -1, std: 1 })).toBe(false);
            
            // Std is zero or negative
            expect(NormalDistribution.validateParameters({ mean: 5, std: 0 })).toBe(false);
            expect(NormalDistribution.validateParameters({ mean: 5, std: -1 })).toBe(false);
            
            // Values are not numbers
            expect(NormalDistribution.validateParameters({ 
                // @ts-ignore - Testing with invalid parameter type
                mean: "5", 
                std: 1 
            })).toBe(false);
            
            expect(NormalDistribution.validateParameters({ 
                mean: 5, 
                // @ts-ignore - Testing with invalid parameter type
                std: "1" 
            })).toBe(false);
            
            // Missing parameters
            expect(NormalDistribution.validateParameters({ 
                // @ts-ignore - Testing with missing parameter
                mean: 5 
            })).toBe(false);
            
            expect(NormalDistribution.validateParameters({ 
                // @ts-ignore - Testing with missing parameter
                std: 1 
            })).toBe(false);
        });
    });
    
    describe('getEffectiveValue', () => {
        it('should return the mean parameter', () => {
            expect(NormalDistribution.getEffectiveValue({ mean: 5, std: 1 })).toBe(5);
            expect(NormalDistribution.getEffectiveValue({ mean: 3, std: 0.5 })).toBe(3);
        });
    });
});
