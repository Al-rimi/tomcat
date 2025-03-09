import { tomcat } from '../utils/tomcat';

export function stopTomcat(): void {
    tomcat('stop');
}