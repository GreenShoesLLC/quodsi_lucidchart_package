import { ModelSerializerFactory, SchemaVersion } from '../../src/serialization/ModelSerializerFactory';
import { createSequentialFlowModel } from '../__fixtures__/models/valid/sequential_flow';
import { UnsupportedVersionError } from '../../src/serialization/errors/UnsupportedVersionError';

describe('ModelSerializerFactory', () => {
    describe('create', () => {
        it('should create a serializer with default version', () => {
            const model = createSequentialFlowModel();
            const serializer = ModelSerializerFactory.create(model);
            expect(serializer).toBeDefined();
            expect(serializer.getVersion().major).toBe(1);
            expect(serializer.getVersion().minor).toBe(0);
        });

        it('should create a serializer with explicit v1.0', () => {
            const model = createSequentialFlowModel();
            const version = new SchemaVersion(1, 0);
            const serializer = ModelSerializerFactory.create(model, version);
            expect(serializer).toBeDefined();
            expect(serializer.getVersion().major).toBe(1);
            expect(serializer.getVersion().minor).toBe(0);
        });

        it('should throw UnsupportedVersionError for unsupported version', () => {
            const model = createSequentialFlowModel();
            const version = new SchemaVersion(2, 0);
            expect(() => ModelSerializerFactory.create(model, version))
                .toThrow(UnsupportedVersionError);
        });
    });

    describe('serialize', () => {
        it('should serialize sequential flow model successfully', () => {
            const model = createSequentialFlowModel();
            const serializer = ModelSerializerFactory.create(model);
            const serialized = serializer.serialize(model);

            // Basic structure checks
            // expect(serialized.formatVersion).toBe('1.0');
            expect(serialized.metadata).toBeDefined();
            
            // Verify model components exist
            expect(serialized.activities).toHaveLength(3);
            expect(serialized.generators).toHaveLength(1);
            expect(serialized.resources).toHaveLength(1);
            expect(serialized.resourceRequirements).toHaveLength(1);
            expect(serialized.entities).toHaveLength(2); // Including default entity
        });
    });
});