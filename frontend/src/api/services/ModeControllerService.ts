/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ModeDto } from '../models/ModeDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ModeControllerService {
    /**
     * Get modes
     * Get all modes
     * @returns ModeDto OK
     * @throws ApiError
     */
    public static getModes(): CancelablePromise<Array<ModeDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/modes',
        });
    }
}
