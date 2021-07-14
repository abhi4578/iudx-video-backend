import { Service } from 'typedi';
import Logger from '../common/Logger';

import Utility from '../common/Utility';
import CameraRepo from '../repositories/CameraRepo';
import ServiceError from '../common/Error';
import UUID from '../common/UUID';
import config from '../config';

@Service()
export default class CameraService {
    constructor(
        private utilityService: Utility,
        private cameraRepo: CameraRepo,
    ) { }

    async register(userId: string, cameraData: any) {
        try {
            const namespace: string = config.host.type + 'Camera';

            cameraData = cameraData.map(camera => {
                const cameraId: string = new UUID().generateUUIDv5(namespace);

                return { cameraId, userId, ...camera }
            })

            return await this.cameraRepo.registerCamera(cameraData);
        } catch (e) {
            Logger.error(e);
            throw new ServiceError('Error Registering the data');
        }
    }

    async findOne(cameraId: string): Promise<any> {
        try {
            return await this.cameraRepo.findCamera(cameraId);
        } catch (e) {
            Logger.error(e);
            throw new ServiceError('Error fetching the data');
        }
    }

    async findAll(page: number, size: number) {
        const { limit, offset } = this.utilityService.getPagination(page, size);

        try {
            const data = await this.cameraRepo.listAllCameras(limit, offset);
            const cameras = this.utilityService.getPagingData(data, page, limit);
            return cameras;
        } catch (e) {
            Logger.error(e);
            throw new ServiceError('Error fetching the data');
        }
    }

    async update(cameraId: string, params: any) {
        try {
            return await this.cameraRepo.updateCamera(cameraId, params);
        } catch (e) {
            Logger.error(e);
            throw new ServiceError('Error updating the data');
        }
    }

    async delete(cameraId: string) {
        try {
            await this.cameraRepo.deleteCamera(cameraId);
        } catch (e) {
            Logger.error(e);
            throw new ServiceError('Error deleting the data');
        }
    }
}
