import { DistributionType } from "./DistributionType";
export type DistributionParameters = MultinomialParameters | UniformParameters | TriangularParameters | ExponentialParameters | NormalParameters | LognormalParameters | BetaParameters | GammaParameters | WeibullParameters | DiscreteParameters | PoissonParameters | BinomialParameters | BernoulliParameters | GeometricParameters | NegativeBinomialParameters | ChiSquareParameters | FDistributionParameters | HypergeometricParameters | LaplaceParameters | LogisticParameters | LogSeriesParameters | ParetoParameters | RayleighParameters | TDistributionParameters | VonMisesParameters | WaldParameters | ZipfParameters;
export interface MultinomialParameters {
    n: number;
    pvals: number[];
}
export interface UniformParameters {
    low: number;
    high: number;
}
export interface TriangularParameters {
    left: number;
    mode: number;
    right: number;
}
export interface ExponentialParameters {
    scale: number;
}
export interface NormalParameters {
    mean: number;
    std: number;
}
export interface LognormalParameters {
    mean: number;
    sigma: number;
}
export interface BetaParameters {
    alpha: number;
    beta: number;
}
export interface GammaParameters {
    shape: number;
    scale: number;
}
export interface WeibullParameters {
    a: number;
}
export interface DiscreteParameters {
    pvals: number[];
}
export interface PoissonParameters {
    lam: number;
}
export interface BinomialParameters {
    n: number;
    p: number;
}
export interface BernoulliParameters {
    p: number;
}
export interface GeometricParameters {
    p: number;
}
export interface NegativeBinomialParameters {
    n: number;
    p: number;
}
export interface ChiSquareParameters {
    df: number;
}
export interface FDistributionParameters {
    dfnum: number;
    dfden: number;
}
export interface HypergeometricParameters {
    ngood: number;
    nbad: number;
    nsample: number;
}
export interface LaplaceParameters {
    loc: number;
    scale: number;
}
export interface LogisticParameters {
    loc: number;
    scale: number;
}
export interface LogSeriesParameters {
    p: number;
}
export interface ParetoParameters {
    a: number;
}
export interface RayleighParameters {
    scale: number;
}
export interface TDistributionParameters {
    df: number;
}
export interface VonMisesParameters {
    mu: number;
    kappa: number;
}
export interface WaldParameters {
    mean: number;
    scale: number;
}
export interface ZipfParameters {
    a: number;
}
export declare class Distribution {
    distributionType: DistributionType;
    parameters: DistributionParameters;
    description: string;
    constructor(distributionType: DistributionType, parameters: DistributionParameters, description?: string);
}
//# sourceMappingURL=Distribution.d.ts.map