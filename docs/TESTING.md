# Testing Protocol

## Test Architecture

```mermaid
graph TD
    A[CI Pipeline] --> B[Unit Tests]
    A --> C[Integration Tests]
    A --> D[Cross-Platform Tests]
    B --> E[Tomcat Class]
    B --> F[Builder Class]
    C --> G[Deployment Scenarios]
    D --> H[Windows]
    D --> I[macOS]
    D --> J[Linux]
```

## Core Test Cases

### 1. Tomcat Manager
```typescript
// Port validation with delay testing
test('Port update with delay handling', async () => {
    jest.useFakeTimers();
    const tomcat = Tomcat.getInstance();
    await tomcat.updatePort();
    jest.advanceTimersByTime(1000);
    expect(setTimeout).toHaveBeenCalledTimes(1);
});

// Improved error logging
test('Logs detailed port errors', async () => {
    const loggerSpy = jest.spyOn(Logger.getInstance(), 'error');
    mockExec.rejects(new Error('Port conflict'));
    await expect(tomcat.updatePort()).rejects.toThrow();
    expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Port update failed'));
});
```

### 2. Deployment Builder
```typescript
// Local build resource sync
test('Synchronizes webapp resources for local deploy', async () => {
  await builder['localDeploy'](projectDir, targetDir, tomcatHome);
  expect(fs.existsSync(path.join(targetDir, 'WEB-INF', 'classes'))).toBe(true);
});

// Build duration logging
test('Logs build completion time', async () => {
  const loggerSpy = jest.spyOn(Logger.getInstance(), 'info');
  await builder.deploy('Local');
  expect(loggerSpy).toHaveBeenCalledWith(
    expect.stringContaining('Build completed in'));
});
```

### 3. AI Streaming (integration)
- Configure a reachable local endpoint (e.g., Ollama) and trigger a WARN/ERROR log; verify the Tomcat output shows a single `[AI]` line streaming token chunks and the status bar reads "AI typing" during the stream.
- Verify diagnostics still open the error file/line and clear after a successful build or file save.

### 3. Logger Component
```typescript
// Syntax coloring rules
test('Applies Java syntax coloring', () => {
    const configSpy = jest.spyOn(vscode.workspace, 'updateConfiguration');
    addSyntaxColoringRules();
    expect(configSpy).toHaveBeenCalledWith(
        expect.objectContaining({
            textMateRules: expect.arrayContaining([
                expect.objectContaining({
                    scope: 'entity.name.class.java'
                })
            ])
        })
    );
});

// Error message organization
test('Structures Java compilation errors', () => {
    const error = new Error('Compilation failure: line 42');
    logger.error('Build failed', error);
    expect(outputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('line 42'));
});
```

### 4. View and Tree Component Tests
```typescript
// View refresh and stale cleanup
test('View.refresh executes Tomcat stale instance cleanup', async () => {
    const tomcat = Tomcat.getInstance();
    const cleanup = jest.spyOn(tomcat, 'cleanupStaleManagedInstances').mockResolvedValue();
    const view = new View();
    await view.refresh();
    expect(cleanup).toHaveBeenCalled();
});

// AppItem state and command behavior
test('AppItem sets appropriate context and command based on running state', () => {
    const item = new AppItem('/workspace/app', true, 8080, false);
    expect(item.contextValue).toBe('tomcatApp.running');
    expect(item.command?.command).toBe('tomcat.apps.openInBrowser');
});

// App create and deploy path
test('View.createApp handles template selection and scaffolding simulation', async () => {
    jest.spyOn(vscode.window, 'showQuickPick').mockResolvedValue({ label: 'Java EE', id: 'javaee' } as any);
    jest.spyOn(vscode.window, 'showInputBox').mockResolvedValue('myapp');
    jest.spyOn(vscode.window, 'showOpenDialog').mockResolvedValue([vscode.Uri.file('/tmp')] as any);
    const view = new View();
    const create = view.createApp();
    await expect(create).resolves.not.toThrow();
});
```

### 5. i18n Unit Tests
```typescript
test('i18n t() returns correct value for default locale', () => {
    initializeLocalization({ globalState: { get: () => false, update: () => Promise.resolve() } } as any);
    const result = t('app.create.frontend.react');
    expect(result).toBe('React');
});

test('translateBuildType maps keys correctly', () => {
    expect(translateBuildType('Local')).toBe('Local');
    expect(translateBuildType('Maven')).toBe('Maven');
    expect(translateBuildType('Gradle')).toBe('Gradle');
});
```


## Test Execution

```bash
# Run specific test suites
npm test -- --grep 'Builder Tests' --color --parallel=false

# Generate coverage report with Istanbul
npm run coverage

# Debug tests in VSCode
F5 -> Select "Extension Tests"
```

## CI/CD Pipeline

```yaml
name: CI Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with: { node-version: 20.x, cache: npm }
      - uses: actions/setup-java@v3
        with: { distribution: 'zulu', java-version: '17' }
      - run: npm install --legacy-peer-deps
      - run: npm test -- --grep 'Builder Tests' --color --parallel=false
        env: { MOCHA_REPORTER: spec, HEADLESS: true }

  cross-platform:
    needs: test
    runs-on: ${{ matrix.os }}
    strategy:
      matrix: { os: [windows-latest, macos-latest, ubuntu-latest] }
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with: { node-version: 20.x, cache: npm }
      - run: |
          if [[ "${{ runner.os }}" == "Linux" ]]; then
            sudo apt-get install -y chromium-browser
          elif [[ "${{ runner.os }}" == "macOS" ]]; then
            brew install --cask google-chrome
          fi
      - run: npm install --legacy-peer-deps
      - run: npm test -- --grep 'Builder Tests' --color --parallel=false
        env: { MOCHA_REPORTER: spec, HEADLESS: true }

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with: { node-version: 20.x, cache: npm }
      - run: npm install --legacy-peer-deps
      - run: npm run compile
      - run: vsce package
      - uses: actions/upload-artifact@v4
        with: { name: tomcat-extension, path: "*.vsix" }
```

## Performance Benchmarks
| Scenario                | Success Criteria | Current Average |
|-------------------------|------------------|-----------------|
| Cold Server Start       | <5s              | 3.2s            |
| Hot Deployment (Fast)   | <800ms           | 720ms           |
| Full Maven Build        | <5s              | 4.1s            |
| Browser Session Resume  | <300ms           | 240ms           |

## Security Testing Matrix
| Test Case               | Method                          | Frequency |
|-------------------------|---------------------------------|-----------|
| XSS in Help Panel       | OWASP ZAP Scan                 | Weekly    |
| Credential Exposure     | Static Code Analysis           | PR Merge  |
| Path Traversal          | Fuzzing Test (/../../etc/passwd)| Nightly   |
| DDoS Resilience         | Load Testing (1000 RPM)        | Monthly   |

## End-to-End Test Cases

### 1. Deployment Scenario
```gherkin
Feature: Full Deployment Lifecycle
  Scenario: Maven-based deployment with auto-reload
    Given a JavaEE project with pom.xml
    When user saves a .java file
    Then extension executes "mvn clean package"
    And deploys WAR to Tomcat/webapps
    And triggers browser refresh via WebSocket
    And displays success notification under 5s
```

### 2. Error Recovery Test
```typescript
test('Handle port conflict', async () => {
  // Force port conflict
  const testServer = net.createServer();
  await testServer.listen(8080);
  
  await expect(Tomcat.getInstance().start())
    .rejects.toThrow('Port 8080 in use');
  
  // Verify rollback
  const config = vscode.workspace.getConfiguration();
  expect(config.get('tomcat.port')).toEqual(8080);
  
  await testServer.close();
});
```