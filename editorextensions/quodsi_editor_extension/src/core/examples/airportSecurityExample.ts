// GENERATED FILE - DO NOT EDIT.
// Source: quodsi_drawio/public/onboarding/example-model.drawio
// Regenerate: node scripts/generate-lucid-onboarding-example.mjs (monorepo root)
// Shape: the document ShapeOpsHandler.handleModelCreatePage consumes.

export type ExampleModelDocument = Record<string, any>;

export const EXAMPLE_PAGE_TITLE = 'Airport Security (example)';

export const AIRPORT_SECURITY_EXAMPLE: ExampleModelDocument = {
  "name": "Airport Security",
  "replications": 10,
  "seed": 12345,
  "timeUnit": "minutes",
  "timeMode": "clock",
  "runTime": {
    "unit": "hours",
    "value": 8
  },
  "warmupTime": {
    "unit": "hours",
    "value": 0
  },
  "resources": [],
  "resourceRequirements": [],
  "entities": [
    {
      "id": "00000000-0000-0000-0000-000000000000",
      "name": "Default Entity"
    }
  ],
  "generators": [
    {
      "id": "FLAiJxHVR5Hvmv668gY8-1",
      "name": "Passengers Arrive",
      "routing": "probability",
      "entityId": "00000000-0000-0000-0000-000000000000",
      "mode": "frequency",
      "interarrivalTime": {
        "unit": "minutes",
        "distribution": "exponential",
        "scale": 1.5
      },
      "batchSize": 1,
      "x": 90,
      "y": 330
    }
  ],
  "activities": [
    {
      "id": "FLAiJxHVR5Hvmv668gY8-2",
      "name": "ID Check",
      "capacity": 2,
      "actions": [
        {
          "id": "95413db5-9753-4715-8e40-47e5a218e73c",
          "type": "delay_with_resource",
          "duration": {
            "unit": "minutes",
            "distribution": "uniform",
            "min": 1,
            "max": 2
          },
          "resourceRequirementId": null,
          "keepResource": false,
          "modifications": [],
          "condition": null,
          "name": "ID Check"
        }
      ],
      "routing": "probability",
      "financialProperties": {
        "enabled": true,
        "fixedCost": 250,
        "costPerEntityProcessed": 0,
        "costPerHourActive": 0,
        "costPerHourIdle": 0,
        "resourceCostMultiplier": 1
      },
      "failureProperties": {
        "enabled": false,
        "mtbfDuration": null,
        "mttrDuration": null,
        "failureClockMode": "wall_clock",
        "repairResourceRequirementId": ""
      },
      "x": 230,
      "y": 340
    },
    {
      "id": "FLAiJxHVR5Hvmv668gY8-3",
      "name": "Security Screening",
      "capacity": 3,
      "actions": [
        {
          "id": "fb10b204-f1e2-4afe-b7ca-522ed7322ff0",
          "type": "delay_with_resource",
          "duration": {
            "unit": "minutes",
            "distribution": "triangular",
            "mode": 5,
            "min": 3,
            "max": 10
          },
          "resourceRequirementId": null,
          "keepResource": false,
          "modifications": [],
          "condition": null,
          "name": "SecurityScreening"
        }
      ],
      "routing": "probability",
      "financialProperties": {
        "enabled": true,
        "fixedCost": 500,
        "costPerEntityProcessed": 0,
        "costPerHourActive": 0,
        "costPerHourIdle": 0,
        "resourceCostMultiplier": 1
      },
      "failureProperties": {
        "enabled": false,
        "mtbfDuration": null,
        "mttrDuration": null,
        "failureClockMode": "wall_clock",
        "repairResourceRequirementId": ""
      },
      "levers": [
        {
          "leverId": "a3f1c2d4-5b6e-4f70-8a91-b2c3d4e5f607",
          "path": "capacity",
          "op": "set",
          "enabled": true,
          "label": "Screening stations",
          "range": {
            "min": 4,
            "max": 8,
            "step": 1
          }
        }
      ],
      "x": 400,
      "y": 340
    },
    {
      "id": "FLAiJxHVR5Hvmv668gY8-4",
      "name": "Pickup belongings & Exit",
      "capacity": 5,
      "actions": [
        {
          "id": "83007b6b-d42c-4eae-be19-a5df7203f55c",
          "type": "delay_with_resource",
          "duration": {
            "unit": "minutes",
            "value": 1
          },
          "resourceRequirementId": null,
          "keepResource": false,
          "modifications": [],
          "condition": null,
          "name": "Exit"
        }
      ],
      "routing": "probability",
      "financialProperties": {
        "enabled": false,
        "fixedCost": 0,
        "costPerEntityProcessed": 0,
        "costPerHourActive": 0,
        "costPerHourIdle": 0,
        "resourceCostMultiplier": 1
      },
      "failureProperties": {
        "enabled": false,
        "mtbfDuration": null,
        "mttrDuration": null,
        "failureClockMode": "wall_clock",
        "repairResourceRequirementId": ""
      },
      "x": 570,
      "y": 340
    }
  ],
  "connectors": [
    {
      "id": "FLAiJxHVR5Hvmv668gY8-5",
      "name": "Passengers Arrive → ID Check",
      "sourceId": "FLAiJxHVR5Hvmv668gY8-1",
      "targetId": "FLAiJxHVR5Hvmv668gY8-2",
      "weight": 1
    },
    {
      "id": "FLAiJxHVR5Hvmv668gY8-6",
      "name": "ID Check → Security Screening",
      "sourceId": "FLAiJxHVR5Hvmv668gY8-2",
      "targetId": "FLAiJxHVR5Hvmv668gY8-3",
      "weight": 1
    },
    {
      "id": "FLAiJxHVR5Hvmv668gY8-7",
      "name": "Security Screening → Pickup belongings & Exit",
      "sourceId": "FLAiJxHVR5Hvmv668gY8-3",
      "targetId": "FLAiJxHVR5Hvmv668gY8-4",
      "weight": 1
    }
  ]
} as const;
