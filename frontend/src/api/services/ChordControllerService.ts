/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ModeScaleChordDto } from '../models/ModeScaleChordDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ChordControllerService {
    /**
     * Get chords by mode and key name
     * Get chords by mode and key name
     * @param key
     * @param mode
     * @returns ModeScaleChordDto OK
     * @throws ApiError
     */
    public static getModeKeyChords(
        key: string,
        mode: string,
    ): CancelablePromise<Array<ModeScaleChordDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/chords',
            query: {
                'key': key,
                'mode': mode,
            },
        });
    }
}
