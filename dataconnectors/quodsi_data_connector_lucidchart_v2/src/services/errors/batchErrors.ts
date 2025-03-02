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