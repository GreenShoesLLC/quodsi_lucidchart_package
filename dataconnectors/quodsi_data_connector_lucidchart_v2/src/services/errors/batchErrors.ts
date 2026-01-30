// src/services/errors/batchErrors.ts

export class BatchConfigurationError extends Error {
    constructor(
        message: string,
        public configurationKey: string,
        public originalError?: Error
    ) {
        super(message);
        this.name = 'BatchConfigurationError';
    }
}

export class BatchJobCreationError extends Error {
    constructor(
        message: string,
        public jobId: string,
        public batchError?: any  // Azure Batch error details
    ) {
        super(message);
        this.name = 'BatchJobCreationError';
    }
}

export class BatchInfrastructureError extends Error {
    constructor(
        message: string,
        public errorType: string,
        public poolId: string,
        public details: {
            poolState?: string;
            totalNodes?: number;
            idleNodes?: number;
        },
        public suggestions: string[]
    ) {
        super(message);
        this.name = 'BatchInfrastructureError';
    }
}

export class BatchTaskFailureError extends Error {
    constructor(
        message: string,
        public readonly errorType: string,
        public readonly jobId: string,
        public readonly taskId: string,
        public readonly details: {
            failureCategory?: string;
            failureCode?: string;
            exitCode?: number;
            taskState?: string;
        },
        public readonly suggestions: string[]
    ) {
        super(message);
        this.name = 'BatchTaskFailureError';
    }
}