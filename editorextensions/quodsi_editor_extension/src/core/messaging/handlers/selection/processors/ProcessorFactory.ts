import { SelectionType } from '@quodsi/lucid-shared';
import { BaseSelectionProcessor } from './BaseSelectionProcessor';
import { NoneSelectionProcessor } from './NoneSelectionProcessor';
import { MultipleSelectionProcessor } from './MultipleSelectionProcessor';
import { ActivityProcessor } from './ActivityProcessor';
import { ConnectorProcessor } from './ConnectorProcessor';
import { ResourceProcessor } from './ResourceProcessor';
import { GeneratorProcessor } from './GeneratorProcessor';
import { ModelProcessor } from './ModelProcessor';
import { UnconvertedProcessor } from './UnconvertedProcessor';
import { SwimLaneProcessor } from './SwimLaneProcessor';

/**
 * Factory for creating the appropriate selection processor
 */
export class ProcessorFactory {
  private static processors: Map<SelectionType, BaseSelectionProcessor> = new Map();
  private static defaultProcessor: BaseSelectionProcessor = new NoneSelectionProcessor();
  
  /**
   * Initialize the processor map with all available processors
   */
  static {
    // Register processors for different selection types
    ProcessorFactory.processors.set(SelectionType.NONE, new NoneSelectionProcessor());
    ProcessorFactory.processors.set(SelectionType.MULTIPLE, new MultipleSelectionProcessor());
    ProcessorFactory.processors.set(SelectionType.ACTIVITY, new ActivityProcessor());
    ProcessorFactory.processors.set(SelectionType.CONNECTOR, new ConnectorProcessor());
    ProcessorFactory.processors.set(SelectionType.RESOURCE, new ResourceProcessor());
    ProcessorFactory.processors.set(SelectionType.GENERATOR, new GeneratorProcessor());
    ProcessorFactory.processors.set(SelectionType.MODEL, new ModelProcessor());
    ProcessorFactory.processors.set(SelectionType.UNCONVERTED_ELEMENT, new UnconvertedProcessor());
    ProcessorFactory.processors.set(SelectionType.UNKNOWN_BLOCK, new UnconvertedProcessor());
    ProcessorFactory.processors.set(SelectionType.SWIMLANE, new SwimLaneProcessor());
  }
  
  /**
   * Get a processor for the specified selection type
   * @param selectionType The selection type
   * @returns The appropriate processor for the selection type
   */
  public static createProcessor(selectionType: SelectionType): BaseSelectionProcessor {
    console.log('[ProcessorFactory] Creating processor for selection type:', selectionType);
    
    const processor = ProcessorFactory.processors.get(selectionType);
    
    if (!processor) {
      console.log('[ProcessorFactory] No processor found for type, using default');
      return ProcessorFactory.defaultProcessor;
    }
    
    return processor;
  }
  
  /**
   * Register a processor for a selection type
   * @param selectionType The selection type
   * @param processor The processor to register
   */
  public static registerProcessor(selectionType: SelectionType, processor: BaseSelectionProcessor): void {
    console.log('[ProcessorFactory] Registering processor for selection type:', selectionType);
    ProcessorFactory.processors.set(selectionType, processor);
  }
  
  /**
   * Get all registered selection types
   * @returns Array of selection types with registered processors
   */
  public static getRegisteredTypes(): SelectionType[] {
    return Array.from(ProcessorFactory.processors.keys());
  }
  
  /**
   * Check if a processor is registered for a selection type
   * @param selectionType The selection type
   * @returns true if a processor is registered, false otherwise
   */
  public static hasProcessor(selectionType: SelectionType): boolean {
    return ProcessorFactory.processors.has(selectionType);
  }
}
