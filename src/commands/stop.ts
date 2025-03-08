import { tomcat } from '../utils/tomcat';

export function stopTomcat() {
    tomcat('stop');
}