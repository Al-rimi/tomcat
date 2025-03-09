import { cleanOldDeployments } from '../utils/deploy';

export function cleanTomcat(): void {
    cleanOldDeployments();
}