// types/simulationTypes.ts
export interface ActivityUtilizationData {
    Id: string;
    Name: string;
    utilization_mean: number;
    utilization_max: number;
    utilization_std_dev: number;
    capacity_mean: number;
    capacity_max: number;
    capacity_std_dev: number;
    contents_mean: number;
    contents_max: number;
    contents_std_dev: number;
    queue_length_mean: number;
    queue_length_max: number;
    queue_length_std_dev: number;
}

export interface ResourceUtilizationData {
    Id: string;
    Name: string;
    utilization_rate_mean: number;
    utilization_rate_max: number;
    utilization_rate_std_dev: number;
    contents_mean: number;
    contents_max: number;
    contents_std_dev: number;
}

export interface ModelData {
    documentId: string;
    pageId: string;
    userId: string;
}