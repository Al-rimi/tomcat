import { tomcat } from '../utils/tomcat';

export function startTomcat(): void {
    tomcat('start');
}