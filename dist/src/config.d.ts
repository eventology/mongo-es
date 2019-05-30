import { ObjectID, MongoClientOptions } from 'mongodb';
import { ConfigOptions, IndicesCreateParams, IndicesPutMappingParams } from '@eventology/elasticsearch';
export declare class MongoConfig {
    url: string;
    options?: MongoClientOptions;
    constructor({ url, options }: {
        url: any;
        options?: {};
    });
}
export declare class ElasticsearchConfig {
    options: ConfigOptions;
    indices: IndicesCreateParams[];
    constructor({ options, indices }: {
        options: any;
        indices?: never[];
    });
}
export declare class CheckPoint {
    phase: 'scan' | 'tail';
    id: ObjectID;
    time: Date;
    constructor({ phase, id, time }: {
        phase: any;
        id?: string;
        time?: number;
    });
}
export declare type ExtractTask = {
    db: string;
    collection: string;
    projection: {
        [key: string]: 1 | 0;
    };
};
export declare type TransformTask = {
    parent?: string;
    mapping: {
        [key: string]: string;
    };
};
export declare type LoadTask = IndicesPutMappingParams;
export declare class Task {
    from: CheckPoint;
    extract: ExtractTask;
    transform: TransformTask;
    load: LoadTask;
    static onSaveCallback: (name: string, checkPoint: CheckPoint) => Promise<void>;
    static onLoadCallback: (name: string) => Promise<any | null>;
    constructor({ from, extract, transform, load }: {
        from: any;
        extract: any;
        transform: any;
        load: any;
    });
    name(): string;
    endScan(): Promise<void>;
    static onSaveCheckpoint(onSaveCallback: (name: string, checkPoint: CheckPoint) => Promise<void>): void;
    static onLoadCheckpoint(onLoadCallback: (name: string) => Promise<any | null>): void;
    static saveCheckpoint(name: string, checkPoint: CheckPoint): Promise<void>;
    static loadCheckpoint(name: string): Promise<CheckPoint | null>;
}
export declare class Controls {
    mongodbReadCapacity: number;
    elasticsearchBulkInterval: number;
    elasticsearchBulkSize: number;
    indexNameSuffix: string;
    constructor({ mongodbReadCapacity, elasticsearchBulkInterval, elasticsearchBulkSize, indexNameSuffix, }: {
        mongodbReadCapacity?: number;
        elasticsearchBulkInterval?: number;
        elasticsearchBulkSize?: number;
        indexNameSuffix?: string;
    });
}
export declare class Config {
    mongodb: MongoConfig;
    elasticsearch: ElasticsearchConfig;
    tasks: Task[];
    controls: Controls;
    constructor(str: string);
}
