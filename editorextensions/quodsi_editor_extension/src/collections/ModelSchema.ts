import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const ModelSchema: SchemaDefinition = {
    fields: [
        { name: "id", type: ScalarFieldTypeEnum.STRING },
        { name: "name", type: ScalarFieldTypeEnum.STRING },
        { name: "reps", type: ScalarFieldTypeEnum.NUMBER },
        { name: "forecastDays", type: ScalarFieldTypeEnum.NUMBER },
        { name: "seed", type: ScalarFieldTypeEnum.NUMBER },
        { name: "oneClockUnit", type: ScalarFieldTypeEnum.STRING },
        { name: "simulationTimeType", type: ScalarFieldTypeEnum.STRING },
        { name: "warmupClockPeriod", type: ScalarFieldTypeEnum.NUMBER },
        { name: "warmupClockPeriodUnit", type: ScalarFieldTypeEnum.STRING },
        { name: "runClockPeriod", type: ScalarFieldTypeEnum.NUMBER },
        { name: "runClockPeriodUnit", type: ScalarFieldTypeEnum.STRING },
        { name: "warmupDateTime", type: ScalarFieldTypeEnum.STRING },
        { name: "startDateTime", type: ScalarFieldTypeEnum.STRING },
        { name: "finishDateTime", type: ScalarFieldTypeEnum.STRING },
        { name: "type", type: ScalarFieldTypeEnum.STRING }
    ],
    primaryKey: ["id"],
    fieldLabels: {
        id: "ID",
        name: "Name",
        reps: "Repetitions",
        forecastDays: "Forecast Days",
        seed: "Random Seed",
        oneClockUnit: "Clock Unit",
        simulationTimeType: "Time Type",
        warmupClockPeriod: "Warmup Period",
        warmupClockPeriodUnit: "Warmup Period Unit",
        runClockPeriod: "Run Period",
        runClockPeriodUnit: "Run Period Unit",
        warmupDateTime: "Warmup Date/Time",
        startDateTime: "Start Date/Time",
        finishDateTime: "Finish Date/Time",
        type: "Type"
    }
};