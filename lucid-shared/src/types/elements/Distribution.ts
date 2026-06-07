import { DistributionType } from "./DistributionType";
import {
    ConstantParameters,
    UniformParameters,
    TriangularParameters,
    NormalParameters
} from "./distributions";
import { BernoulliParameters } from "./distributions/BernoulliDistribution";
import { BetaParameters } from "./distributions/BetaDistribution";
import { BinomialParameters } from "./distributions/BinomialDistribution";
import { ChiSquareParameters } from "./distributions/ChiSquareDistribution";
import { DiscreteParameters } from "./distributions/DiscreteDistribution";
import { ExponentialParameters } from "./distributions/ExponentialDistribution";
import { FDistributionParameters } from "./distributions/FDistribution";
import { GammaParameters } from "./distributions/GammaDistribution";
import { GeometricParameters } from "./distributions/GeometricDistribution";
import { HypergeometricParameters } from "./distributions/HypergeometricDistribution";
import { LaplaceParameters } from "./distributions/LaplaceDistribution";
import { LogSeriesParameters } from "./distributions/LogSeriesDistribution";
import { LogisticParameters } from "./distributions/LogisticDistribution";
import { LognormalParameters } from "./distributions/LognormalDistribution";
import { MultinomialParameters } from "./distributions/MultinomialDistribution";
import { NegativeBinomialParameters } from "./distributions/NegativeBinomialDistribution";
import { ParetoParameters } from "./distributions/ParetoDistribution";
import { PoissonParameters } from "./distributions/PoissonDistribution";
import { RayleighParameters } from "./distributions/RayleighDistribution";
import { TDistributionParameters } from "./distributions/TDistribution";
import { VonMisesParameters } from "./distributions/VonMisesDistribution";
import { WaldParameters } from "./distributions/WaldDistribution";
import { WeibullParameters } from "./distributions/WeibullDistribution";
import { ZipfParameters } from "./distributions/ZipfDistribution";

/**
 * Union type of all possible distribution parameters.
 */
export type DistributionParameters =
    | ConstantParameters  // New parameter type
    | MultinomialParameters
    | UniformParameters
    | TriangularParameters
    | ExponentialParameters
    | NormalParameters
    | LognormalParameters
    | BetaParameters
    | GammaParameters
    | WeibullParameters
    | DiscreteParameters
    | PoissonParameters
    | BinomialParameters
    | BernoulliParameters
    | GeometricParameters
    | NegativeBinomialParameters
    | ChiSquareParameters
    | FDistributionParameters
    | HypergeometricParameters
    | LaplaceParameters
    | LogisticParameters
    | LogSeriesParameters
    | ParetoParameters
    | RayleighParameters
    | TDistributionParameters
    | VonMisesParameters
    | WaldParameters
    | ZipfParameters;

/**
 * Class representing a statistical distribution.
 */
export class Distribution {
    constructor(
        public distributionType: DistributionType,
        public parameters: DistributionParameters,
        public description: string = ""
    ) { }
}
