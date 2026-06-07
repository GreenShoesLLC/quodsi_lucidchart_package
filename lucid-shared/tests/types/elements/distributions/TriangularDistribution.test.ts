import { DistributionType } from "../../../../src/types/elements/DistributionType";
import { 
    TriangularParameters, 
    TriangularDistribution 
} from "../../../../src/types/elements/distributions";

describe('TriangularDistribution', () => {
    describe('createDefault', () => {
        it('should create a distribution with default parameters', () => {
            const distribution = TriangularDistribution.createDefault();
            
            expect(distribution.distributionType).toBe(DistributionType.TRIANGULAR);
            
            const params = distribution.parameters as TriangularParameters;
            expect(params.left).toBe(0);
            expect(params.mode).toBe(5);
            expect(params.right).toBe(10);
        });
    });
    
    describe('create', () => {
        it('should create a distribution with the specified parameters', () => {
            const distribution = TriangularDistribution.create(1, 4, 7);
            
            expect(distribution.distributionType).toBe(DistributionType.TRIANGULAR);
            
            const params = distribution.parameters as TriangularParameters;
            expect(params.left).toBe(1);
            expect(params.mode).toBe(4);
            expect(params.right).toBe(7);
        });
    });
    
    describe('validateParameters', () => {
        it('should return true for valid parameters', () => {
            expect(TriangularDistribution.validateParameters({ left: 0, mode: 5, right: 10 })).toBe(true);
            expect(TriangularDistribution.validateParameters({ left: 5, mode: 5, right: 10 })).toBe(true);
            expect(TriangularDistribution.validateParameters({ left: 5, mode: 10, right: 10 })).toBe(true);
        });
        
        it('should return false for invalid parameters', () => {
            // Left is negative
            expect(TriangularDistribution.validateParameters({ left: -1, mode: 5, right: 10 })).toBe(false);
            
            // Mode is less than left
            expect(TriangularDistribution.validateParameters({ left: 5, mode: 3, right: 10 })).toBe(false);
            
            // Right is less than mode
            expect(TriangularDistribution.validateParameters({ left: 0, mode: 5, right: 3 })).toBe(false);
            
            // Values are not numbers
            expect(TriangularDistribution.validateParameters({ 
                // @ts-ignore - Testing with invalid parameter type
                left: "0", 
                mode: 5, 
                right: 10
            })).toBe(false);
            
            expect(TriangularDistribution.validateParameters({ 
                left: 0, 
                // @ts-ignore - Testing with invalid parameter type
                mode: "5", 
                right: 10 
            })).toBe(false);
            
            expect(TriangularDistribution.validateParameters({ 
                left: 0, 
                mode: 5, 
                // @ts-ignore - Testing with invalid parameter type
                right: "10" 
            })).toBe(false);
            
            // Missing parameters
            expect(TriangularDistribution.validateParameters({ 
                // @ts-ignore - Testing with missing parameters
                left: 0, 
                mode: 5 
            })).toBe(false);
            
            expect(TriangularDistribution.validateParameters({ 
                // @ts-ignore - Testing with missing parameters
                mode: 5, 
                right: 10 
            })).toBe(false);
            
            expect(TriangularDistribution.validateParameters({ 
                // @ts-ignore - Testing with missing parameters
                left: 0, 
                right: 10 
            })).toBe(false);
        });
    });
    
    describe('getEffectiveValue', () => {
        it('should return the mean of left, mode, and right', () => {
            expect(TriangularDistribution.getEffectiveValue({ left: 0, mode: 5, right: 10 })).toBe(5);
            expect(TriangularDistribution.getEffectiveValue({ left: 0, mode: 6, right: 9 })).toBe(5);
            expect(TriangularDistribution.getEffectiveValue({ left: 3, mode: 6, right: 9 })).toBe(6);
        });
    });
});
