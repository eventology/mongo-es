import { Client, BulkIndexDocumentsParams } from '@eventology/elasticsearch';
import { ESDoc } from './types';
import { ElasticsearchConfig, Task } from './config';
export default class Elasticsearch {
    static client: Client;
    task: Task;
    searchBuffer: {
        [id: string]: ((doc: ESDoc | null) => void)[];
    };
    searchRunning: boolean;
    retrieveBuffer: {
        [id: string]: ((doc: ESDoc | null) => void)[];
    };
    retrieveRunning: boolean;
    constructor(elasticsearch: ElasticsearchConfig, task: Task);
    bulk(params: BulkIndexDocumentsParams): Promise<void>;
    search(id: string): Promise<ESDoc | null>;
    _search(): Promise<void>;
    _searchBatchSafe(ids: string[]): Promise<{
        [id: string]: ESDoc;
    }>;
    retrieve(id: string): Promise<ESDoc | null>;
    _retrieve(): Promise<void>;
    _retrieveBatchSafe(ids: string[]): Promise<{
        [id: string]: ESDoc;
    }>;
    _mapResponse(hit: {
        _id: string;
        _parent?: string;
        _source: ESDoc;
    }): ESDoc;
}
