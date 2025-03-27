import * as net from 'net';
import * as fs from 'fs/promises';
import path from 'path';
import { findTomcatHome, tomcat } from './tomcat';
import { success } from './logger';

const PORT_RANGE = { min: 1024, max: 65535 };

export class PortManager {
    
    private static async validatePort(port: number): Promise<void> {
        if (port < PORT_RANGE.min) throw new Error(
            `Ports below ${PORT_RANGE.min} require admin privileges`
        );
        
        if (port > PORT_RANGE.max) throw new Error(
            `Maximum allowed port is ${PORT_RANGE.max}`
        );
    }

    private static async checkPortAvailability(port: number): Promise<void> {
        const isFree = await new Promise(resolve => {
            const server = net.createServer();
            server.once('error', () => resolve(false));
            server.once('listening', () => {
                server.close();
                resolve(true);
            });
            server.listen(port);
        });

        if (!isFree) throw new Error(`Port ${port} is already in use`);
    }

    public static async updateTomcatPort(newPort: number): Promise<void> {
        try {
            await this.validatePort(newPort);
            await this.checkPortAvailability(newPort);

            const tomcatHome = await findTomcatHome();
            if (!tomcatHome) throw new Error('Tomcat home not found');

            const serverXmlPath = path.join(tomcatHome, 'conf', 'server.xml');
            const content = await fs.readFile(serverXmlPath, 'utf8');
            
            const updatedContent = content.replace(
                /(port=")\d+(".*protocol="HTTP\/1\.1")/,
                `$1${newPort}$2`
            );

            if (content === updatedContent) {
                throw new Error('HTTP/1.1 connector not found in server.xml');
            }

            await fs.writeFile(serverXmlPath, updatedContent);
            success(`Port updated to ${newPort}`);

            tomcat('restart');
        } catch (err) {
            throw err;
        }
    }
}