/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ScaleNoteDto } from '../models/ScaleNoteDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ScaleControllerService {
    /**
     * Get scale notes
     * Get scale notes
     * @param key
     * @param mode
     * @returns ScaleNoteDto OK
     * @throws ApiError
     */
    public static getScaleNotes(
        key: string,
        mode: string,
    ): CancelablePromise<Array<ScaleNoteDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/scales',
            query: {
                'key': key,
                'mode': mode,
            },
        });
    }
}
