import { Service } from 'typedi';
import Logger from '../common/Logger';

import Utility from '../common/Utility';
import CameraRepo from '../repositories/CameraRepo';
import ServiceError from '../common/Error';
import UUID from '../common/UUID';
import config from '../config';
import StreamRepo from '../repositories/StreamRepo';
import FfmpegService from './FfmpegService';

@Service()
export default class CameraService {
    constructor(
        private utilityService: Utility,
        private cameraRepo: CameraRepo,
        private streamRepo: StreamRepo,
        private ffmpegService: FfmpegService,
    ) { }

    public async register(userId: string, cameraData: any) {
        try {
            const namespace: string = config.host.type + 'Camera';
            const cameras: Array<any> = [];

            for (const camera of cameraData) {
                const cameraId: string = new UUID().generateUUIDv5(namespace);
                const isDuplicateCamera: any = await this.cameraRepo.findCamera(camera);

                if (isDuplicateCamera) {
                    return null;
                }

                cameras.push({ cameraId, userId, ...camera });
            }

            let result = await this.cameraRepo.registerCamera(cameras);
            result = result.map(camera => {
                return {
                    cameraId: camera.cameraId,
                    cameraNum: camera.cameraNum,
                    cameraName: camera.cameraName,
                    cameraType: camera.cameraType,
                    cameraUsage: camera.cameraUsage,
                    cameraOrientation: camera.cameraOrientation,
                    city: camera.city,
                }
            });

            return result;
        } catch (e) {
            Logger.error(e);
            throw new ServiceError('Error Registering the data');
        }
    }

    public async findOne(userId: string, cameraId: string): Promise<any> {
        try {
            return await this.cameraRepo.findCamera({ userId, cameraId });
        } catch (e) {
            Logger.error(e);
            throw new ServiceError('Error fetching the data');
        }
    }

    public async listAssociatedStreams(userId: string, cameraId: string): Promise<any> {
        try {
            const fields = [
                'streamId',
                'provenanceStreamId',
                'streamName',
                'streamUrl',
                'streamType',
                'type',
                'isPublic',
            ];
            const streams: Array<any> = await this.streamRepo.findAllStreams({ userId, cameraId }, fields);

            if (streams.length === 0) {
                return null;
            }

            return streams;
        } catch (e) {
            Logger.error(e);
            throw new ServiceError('Error fetching the data');
        }
    }

    public async findAll(page: number, size: number) {
        try {
            const { limit, offset } = this.utilityService.getPagination(page, size);
            const data = await this.cameraRepo.listAllCameras(limit, offset);
            const cameras = this.utilityService.getPagingData(data, page, limit);
            return cameras;
        } catch (e) {
            Logger.error(e);
            throw new ServiceError('Error fetching the data');
        }
    }

    public async update(userId: string, cameraId: string, params: any) {
        try {
            const fields = [
                'cameraId',
                'cameraNum',
                'cameraName',
                'cameraType',
                'cameraUsage',
                'cameraOrientation',
                'city',
            ];
            const [updated, result] = await this.cameraRepo.updateCamera(params, { userId, cameraId }, fields);

            if (!updated) {
                return null;
            }

            return result;
        } catch (e) {
            Logger.error(e);
            throw new ServiceError('Error updating the data');
        }
    }

    public async delete(userId: string, cameraId: string) {
        try {
            const streams: Array<any> = await this.streamRepo.findAllStreams({ userId, cameraId });

            if (streams.length > 0) {
                for (const stream of streams) {
                    if (!stream.processId) continue;
                    const isProcessRunning = await this.ffmpegService.isProcessRunning(stream.processId);

                    if (isProcessRunning) {
                        await this.ffmpegService.killProcess(stream.processId);
                    }
                }
                await this.streamRepo.deleteStream({ cameraId });
            }

            return await this.cameraRepo.deleteCamera({ userId, cameraId });
        } catch (e) {
            Logger.error(e);
            throw new ServiceError('Error deleting the data');
        }
    }
}
