import { DistributionType } from '@quodsi/shared';
import { 
    UniformParameters, 
    UniformDistribution 
} from "../../../../src/types/elements/distributions";

describe('UniformDistribution', () => {
    describe('createDefault', () => {
        it('should create a distribution with default parameters', () => {
            const distribution = UniformDistribution.createDefault();
            
            expect(distribution.distributionType).toBe(DistributionType.UNIFORM);
            
            const params = distribution.parameters as UniformParameters;
            expect(params.low).toBe(0);
            expect(params.high).toBe(10);
        });
    });
    
    describe('create', () => {
        it('should create a distribution with the specified parameters', () => {
            const distribution = UniformDistribution.create(2, 8);
            
            expect(distribution.distributionType).toBe(DistributionType.UNIFORM);
            
            const params = distribution.parameters as UniformParameters;
            expect(params.low).toBe(2);
            expect(params.high).toBe(8);
        });
    });
    
    describe('validateParameters', () => {
        it('should return true for valid parameters', () => {
            expect(UniformDistribution.validateParameters({ low: 0, high: 10 })).toBe(true);
            expect(UniformDistribution.validateParameters({ low: 5, high: 5.1 })).toBe(true);
        });
        
        it('should return false for invalid parameters', () => {
            // Low is negative
            expect(UniformDistribution.validateParameters({ low: -1, high: 10 })).toBe(false);
            
            // High is less than or equal to low
            expect(UniformDistribution.validateParameters({ low: 10, high: 5 })).toBe(false);
            expect(UniformDistribution.validateParameters({ low: 5, high: 5 })).toBe(false);
            
            // Values are not numbers
            expect(UniformDistribution.validateParameters({ 
                // @ts-ignore - Testing with invalid parameter type
                low: "0", 
                high: 10 
            })).toBe(false);
            
            expect(UniformDistribution.validateParameters({ 
                low: 0, 
                // @ts-ignore - Testing with invalid parameter type
                high: "10" 
            })).toBe(false);
            
            // Missing parameters
            expect(UniformDistribution.validateParameters({ 
                // @ts-ignore - Testing with missing parameter
                low: 0 
            })).toBe(false);
            
            expect(UniformDistribution.validateParameters({ 
                // @ts-ignore - Testing with missing parameter
                high: 10 
            })).toBe(false);
        });
    });
    
    describe('getEffectiveValue', () => {
        it('should return the mean of low and high', () => {
            expect(UniformDistribution.getEffectiveValue({ low: 0, high: 10 })).toBe(5);
            expect(UniformDistribution.getEffectiveValue({ low: 2, high: 8 })).toBe(5);
            expect(UniformDistribution.getEffectiveValue({ low: 5, high: 15 })).toBe(10);
        });
    });
});
