import { Client, IndicesCreateParams, IndicesPutMappingParams, IndicesExistsParams } from 'elasticsearch';
import { Config } from './config';
export default class Indices {
    static client: Client;
    private constructor();
    static init(config: Config): Promise<void>;
    create(params: IndicesCreateParams): Promise<void>;
    putMapping(params: IndicesPutMappingParams): Promise<void>;
    exists(params: IndicesExistsParams): Promise<boolean>;
}
