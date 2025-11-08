import React from 'react';
import { useIntegratedAppLogic } from './hooks/useIntegratedAppLogic';

/**
 * Invisible component that runs all app effects without affecting parent renders.
 */
const EffectsManager: React.FC = () => {
    useIntegratedAppLogic();
    return null;
};

export default EffectsManager;