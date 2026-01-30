// src/services/errors/storageErrors.ts

export class StorageError extends Error {
    constructor(
        message: string,
        public readonly errorType: string,
        public readonly details: Record<string, any>,
        public readonly suggestions: string[]
    ) {
        super(message);
        this.name = 'StorageError';
    }
}

export class StorageContainerNotFoundError extends StorageError {
    constructor(containerName: string) {
        super(
            'Simulation data storage not found',
            'STORAGE_NOT_FOUND',
            { containerName },
            [
                'The simulation data may have been deleted',
                'Try running the simulation again'
            ]
        );
        this.name = 'StorageContainerNotFoundError';
    }
}

export class StoragePermissionError extends StorageError {
    constructor(containerName: string, operation: string) {
        super(
            'Unable to access simulation data',
            'STORAGE_PERMISSION',
            { containerName, operation },
            [
                'There may be a configuration issue',
                'Contact your administrator'
            ]
        );
        this.name = 'StoragePermissionError';
    }
}

export class StorageNetworkError extends StorageError {
    constructor(operation: string) {
        super(
            'Unable to connect to simulation data storage',
            'STORAGE_NETWORK',
            { operation },
            [
                'This is typically a temporary issue',
                'Please try again in a few moments'
            ]
        );
        this.name = 'StorageNetworkError';
    }
}
