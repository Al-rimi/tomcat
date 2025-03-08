import * as vscode from 'vscode';

export function showHelp() {
    const helpMessage = `
=============================================================
             Tomcat Extension - Deployment Script Help
=============================================================
Tomcat: <Actions>

stop      - Gracefully stops the Tomcat service if running.
            Ensures no abrupt service termination.

clean     - Cleans the Tomcat deployment directory.
            Removes temporary files and cached data to ensure a fresh deployment.

start     - Starts the Tomcat service.
            Ensures the service is up and running after cleaning or deploying.

deploy    - Deploys the latest application version to the Tomcat server.
            Copies necessary files and prepares the environment.
            Requires a subaction:
              Fast - Copies files directly from the development folder.
              Maven - Builds the project with Maven and deploys the generated WAR file.

help      - Displays this help message with detailed descriptions.
`;

    const outputChannel = vscode.window.createOutputChannel('Tomcat Help');
    outputChannel.appendLine(helpMessage);
    outputChannel.show();
}