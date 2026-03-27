import { InstanceSource } from './InstanceSource';

/**
 * InstanceInfo type for Tree view nodes and commands
 *
 * Contains the properties representing a Tomcat instance
 * as shown in the UI and for commands (open, stop, etc.).
 *
 * @property pid Running process ID
 * @property port Optional HTTP port
 * @property app Optional application name
 * @property workspace Optional workspace path
 * @property command Optional service command line description
 * @property home Optional Tomcat home path
 * @property version Optional Tomcat version string
 * @property source InstanceSource ('managed' | 'external')
 */
export interface InstanceInfo {
    pid: number;
    port?: number;
    app?: string;
    workspace?: string;
    command?: string;
    home?: string;
    version?: string;
    source: InstanceSource;
}
