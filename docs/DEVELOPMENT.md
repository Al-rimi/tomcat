# Development Guide

## Code Structure

```bash
src/
├── extension.ts              # Extension entry point
├── utils/
│   ├── Tomcat.ts             # Server management core
│   ├── Builder.ts            # Deployment pipelines
│   ├── Browser.ts            # Browser integration
│   └── Logger.ts             # Logging system
├── types/                    # Type definitions
test/
├── suite/                    # Test cases
   ├── tomcat.test.ts         # Server tests
   ├── builder.test.ts        # Deployment tests
   └── browser.test.ts        # Browser tests
```

## Key Implementation Patterns

1. **Singleton Services**:
```typescript
// Centralized service management
export class Tomcat {
    private static instance: Tomcat;
    public static getInstance(): Tomcat {
        if (!Tomcat.instance) {
            Tomcat.instance = new Tomcat();
        }
        return Tomcat.instance;
    }
}
```

2. **Strategy Pattern (Deployment)**:
```typescript
// Build type selection
const action = {
    'Fast': () => this.fastDeploy(projectDir, targetDir, tomcatHome),
    'Maven': () => this.mavenDeploy(projectDir, targetDir),
    'Gradle': () => this.gradleDeploy(projectDir, targetDir, appName)
}[type];
```

3. **Observer Pattern (Config Changes)**:
```typescript
// Reactive configuration updates
vscode.workspace.onDidChangeConfiguration(async (event) => {
    if (event.affectsConfiguration('tomcat.port')) {
        await Tomcat.getInstance().updatePort();
    }
});
```

4. **Factory Pattern (Browser Commands)**:
```typescript
// Platform-specific command generation
private getBrowserCommand(browser: string, url: string): string | null {
    const platform = process.platform as 'win32'|'darwin'|'linux';
    return Browser.COMMANDS[browser]?.[platform]?.join(' ');
}
```

## Extension Activation

```typescript
// extension.ts - Main activation sequence
export function activate(context: vscode.ExtensionContext) {
    const logger = Logger.getInstance();
    logger.activate(context);
    
    // Register command handlers
    context.subscriptions.push(
        vscode.commands.registerCommand('tomcat.start', () => 
            Tomcat.getInstance().start()),
        vscode.commands.registerCommand('tomcat.deploy', () =>
            Builder.getInstance().deploy('Choice'))
    );
    
    // Setup auto-deploy listeners
    if (Builder.isJavaEEProject()) {
        context.subscriptions.push(
            vscode.workspace.onWillSaveTextDocument((e) => 
                Builder.getInstance().autoDeploy(e.reason))
        );
    }
}
```

## Build Process

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run tests
npm test

# Package extension
vsce package