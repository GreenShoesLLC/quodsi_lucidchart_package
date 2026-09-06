// editorextensions/quodsi_editor_extension/src/core/messaging/handlers/shapeOpsHandler.ts
//
// Advisor drawing half, Task 4: creates, deletes and moves shapes on the
// current page in response to SHAPE_CREATE / SHAPE_DELETE / SHAPE_MOVE.
// These are the "single shape op" half of the Advisor's write path -- the
// embedded Studio iframe (Task 3's EmbeddedStudioFrame) sends them with
// source 'studio-embed-iframe' whenever the Advisor proposes adding,
// removing or repositioning one Activity/Generator/Connector on the page.
// MODEL_CREATE_PAGE (bulk page creation from an Advisor-authored document)
// is Task 5 -- the switch below has a slot ready for it but does not handle
// it yet, so it falls through to `default: return false` like any other
// unhandled message.
//
// Mirrors ElementOpsHandler.handleElementUpdate for the
// client/viewport/currentPage/getResponseChannel/reply/selection-refresh
// pattern, and LucidPageConversionService (~lines 700-730) for the
// addBlock -> createPlatformObject -> registerElement creation sequence.
import {
  EnvelopeBase,
  EnvelopeMessageType,
  JsonObject,
  SimulationObjectType,
  getLogger,
} from '@quodsi/lucid-shared';
import { router } from '../index';
import { Viewport } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';
import { StorageAdapter } from '../../StorageAdapter';
import { LucidElementFactory } from '../../../services/LucidElementFactory';
import { PanelRole } from '../types';
import { SelectionHandler } from './selection/SelectionHandler';
import { placeNear, placeAtFlowEnd, ShapeSide } from './shapePlacement';

const log = getLogger('ShapeOpsHandler');

type ShapeType = 'Activity' | 'Generator' | 'Connector';

/**
 * Handler for single-shape create/delete/move operations, driven by the
 * embedded Studio iframe (Advisor drawing half).
 */
export class ShapeOpsHandler {
  /**
   * Handle messages related to single-shape operations.
   *
   * @param msg The received message
   * @returns Whether the message was handled
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.SHAPE_CREATE:
        ShapeOpsHandler.handleShapeCreate(msg)
          .catch(err => log.error('Error in handleShapeCreate:', err));
        return true;

      case EnvelopeMessageType.SHAPE_DELETE:
        ShapeOpsHandler.handleShapeDelete(msg)
          .catch(err => log.error('Error in handleShapeDelete:', err));
        return true;

      case EnvelopeMessageType.SHAPE_MOVE:
        ShapeOpsHandler.handleShapeMove(msg)
          .catch(err => log.error('Error in handleShapeMove:', err));
        return true;

      // EnvelopeMessageType.MODEL_CREATE_PAGE: bulk page creation from an
      // Advisor-authored document. Task 5 -- not implemented here yet.

      // Not a shape operations message
      default:
        return false;
    }
  }

  /**
   * Determine which channel to send a response to. Today every shape-op
   * message comes from the embedded Studio iframe ('studio-embed-iframe');
   * anything else falls back to 'model' the way ElementOpsHandler's own
   * getResponseChannel does for its unlisted sources.
   */
  private static getResponseChannel(msg: EnvelopeBase): PanelRole {
    if (msg.source === 'studio-embed-iframe') return 'studio-embed';
    return 'model';
  }

  private static newElementFactory(): LucidElementFactory {
    const storageAdapter = new StorageAdapter();
    return new LucidElementFactory(storageAdapter);
  }

  private static shapeSimType(shapeType: ShapeType): SimulationObjectType {
    switch (shapeType) {
      case 'Activity':
        return SimulationObjectType.Activity;
      case 'Generator':
        return SimulationObjectType.Generator;
      case 'Connector':
        return SimulationObjectType.Connector;
    }
  }

  /**
   * Handle SHAPE_CREATE: creates one Activity/Generator (a block) or
   * Connector (a line) on the current page.
   */
  private static async handleShapeCreate(msg: EnvelopeBase): Promise<boolean> {
    const data = msg.data as {
      shapeType: ShapeType;
      element: JsonObject;
      near?: { elementId: string; side: ShapeSide };
    };

    const channel = ShapeOpsHandler.getResponseChannel(msg);
    log.debug('Shape create requested', { shapeType: data.shapeType, near: data.near });

    try {
      const client = ModelManager.getClient();
      const modelManager = ModelManager.getInstance();
      const viewport = new Viewport(client);
      const page = viewport.getCurrentPage();
      if (!page) {
        throw new Error('Current page not available');
      }

      const advisorElement = (data.element ?? {}) as JsonObject;
      let newId: string;

      if (data.shapeType === 'Connector') {
        const sourceId = (advisorElement as any).sourceId;
        const targetId = (advisorElement as any).targetId;

        const sourceBlock = sourceId ? page.allBlocks.get(sourceId) : undefined;
        if (!sourceBlock) {
          throw new Error(`Connector source not found: ${sourceId}`);
        }
        const targetBlock = targetId ? page.allBlocks.get(targetId) : undefined;
        if (!targetBlock) {
          throw new Error(`Connector target not found: ${targetId}`);
        }

        const newLine = page.addLine({
          endpoint1: { connection: sourceBlock, linkX: 1, linkY: 0.5 },
          endpoint2: { connection: targetBlock, linkX: 0, linkY: 0.5 },
        });

        const factory = ShapeOpsHandler.newElementFactory();
        const platformObject = factory.createPlatformObject(newLine, SimulationObjectType.Connector, true);
        const record = {
          ...platformObject.getSimulationObject(),
          ...advisorElement,
          id: newLine.id,
          sourceId: sourceBlock.id,
          targetId: targetBlock.id,
        };

        await modelManager.registerElement(record as any, newLine);
        newId = newLine.id;
      } else {
        let box;
        if (data.near) {
          const anchor = page.allBlocks.get(data.near.elementId);
          if (!anchor) {
            throw new Error(`Placement anchor not found: ${data.near.elementId}`);
          }
          box = placeNear(page as any, anchor as any, data.near.side);
        } else {
          box = placeAtFlowEnd(page as any, modelManager as any);
        }

        const newBlock = page.addBlock({ className: 'ProcessBlock', boundingBox: box });

        const name = (advisorElement as any).name ?? `New ${data.shapeType}`;
        newBlock.textAreas.set('Text', name);

        const factory = ShapeOpsHandler.newElementFactory();
        const platformObject = factory.createPlatformObject(
          newBlock,
          ShapeOpsHandler.shapeSimType(data.shapeType),
          true
        );
        const record = {
          ...platformObject.getSimulationObject(),
          ...advisorElement,
          id: newBlock.id,
        };

        await modelManager.registerElement(record as any, newBlock);
        newId = newBlock.id;
      }

      await modelManager.validateModel();

      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.SHAPE_CREATE_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: { success: true, id: newId },
      });

      const selectedItems = viewport.getSelectedItems();
      await SelectionHandler.handleLucidSelectionEvent(client, selectedItems, modelManager);

      return true;
    } catch (error) {
      log.error('Error creating shape', error);

      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.SHAPE_CREATE_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: {
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });

      return false;
    }
  }

  /**
   * Handle SHAPE_DELETE: deletes one shape. For an Activity/Generator block,
   * also deletes every line attached to it (source or target end) before
   * the block itself, so the model's connector list never briefly points at
   * a deleted block. removeElement is called for each deleted id, lines
   * first, matching canvas-deletion order.
   */
  private static async handleShapeDelete(msg: EnvelopeBase): Promise<boolean> {
    const data = msg.data as { shapeType: ShapeType; elementId: string };
    const channel = ShapeOpsHandler.getResponseChannel(msg);
    log.debug('Shape delete requested', { shapeType: data.shapeType, elementId: data.elementId });

    try {
      const client = ModelManager.getClient();
      const modelManager = ModelManager.getInstance();
      const viewport = new Viewport(client);
      const page = viewport.getCurrentPage();
      if (!page) {
        throw new Error('Current page not available');
      }

      const deletedIds: string[] = [];

      if (data.shapeType === 'Connector') {
        const line = page.allLines.get(data.elementId);
        if (!line) {
          throw new Error(`Element not found: ${data.elementId}`);
        }
        line.delete();
        deletedIds.push(line.id);
      } else {
        const block = page.allBlocks.get(data.elementId);
        if (!block) {
          throw new Error(`Element not found: ${data.elementId}`);
        }

        const connectedLines: any[] = [];
        for (const line of page.allLines.values()) {
          const sourceId = line.getEndpoint1().connection?.id;
          const targetId = line.getEndpoint2().connection?.id;
          if (sourceId === block.id || targetId === block.id) {
            connectedLines.push(line);
          }
        }

        for (const line of connectedLines) {
          line.delete();
          deletedIds.push(line.id);
        }

        block.delete();
        deletedIds.push(block.id);
      }

      for (const id of deletedIds) {
        await modelManager.removeElement(id);
      }

      await modelManager.validateModel();

      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.SHAPE_DELETE_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: { success: true, deletedIds },
      });

      const selectedItems = viewport.getSelectedItems();
      await SelectionHandler.handleLucidSelectionEvent(client, selectedItems, modelManager);

      return true;
    } catch (error) {
      log.error('Error deleting shape', error);

      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.SHAPE_DELETE_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: {
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });

      return false;
    }
  }

  /**
   * Handle SHAPE_MOVE: repositions a block, keeping its current size.
   */
  private static async handleShapeMove(msg: EnvelopeBase): Promise<boolean> {
    const data = msg.data as { elementId: string; x: number; y: number };
    const channel = ShapeOpsHandler.getResponseChannel(msg);
    log.debug('Shape move requested', { elementId: data.elementId, x: data.x, y: data.y });

    try {
      const client = ModelManager.getClient();
      const viewport = new Viewport(client);
      const page = viewport.getCurrentPage();
      if (!page) {
        throw new Error('Current page not available');
      }

      const block = page.allBlocks.get(data.elementId);
      if (!block) {
        throw new Error(`Element not found: ${data.elementId}`);
      }

      const box = block.getBoundingBox();
      block.setBoundingBox({ x: data.x, y: data.y, w: box.w, h: box.h });

      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.SHAPE_MOVE_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: { success: true },
      });

      const modelManager = ModelManager.getInstance();
      const selectedItems = viewport.getSelectedItems();
      await SelectionHandler.handleLucidSelectionEvent(client, selectedItems, modelManager);

      return true;
    } catch (error) {
      log.error('Error moving shape', error);

      router.send(channel, {
        id: msg.id,
        type: EnvelopeMessageType.SHAPE_MOVE_RESULT,
        source: 'host',
        target: `${channel}-iframe`,
        version: '1.0',
        data: {
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });

      return false;
    }
  }
}
