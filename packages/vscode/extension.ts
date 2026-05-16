/**
 * Nexarion VS Code Extension v0.5
 *
 * Live agent list via HTTP fetch, tool execution terminal, status bar.
 */
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const agentProvider = new AgentTreeProvider();
  vscode.window.registerTreeDataProvider('nexarion-agents', agentProvider);

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.text = '$(plug) Nexarion';
  statusBar.command = 'nexarion.listAgents';
  statusBar.show();
  context.subscriptions.push(statusBar);

  context.subscriptions.push(vscode.commands.registerCommand('nexarion.listAgents', () => agentProvider.refresh()));
  context.subscriptions.push(vscode.commands.registerCommand('nexarion.listTools', () => {
    const t = vscode.window.createTerminal('Nexarion Tools'); t.show(); t.sendText('npx nexarioncli tools');
  }));
  context.subscriptions.push(vscode.commands.registerCommand('nexarion.callTool', async () => {
    const n = await vscode.window.showInputBox({ prompt: 'Tool name' });
    if (!n) return;
    const a = await vscode.window.showInputBox({ prompt: 'JSON args', value: '{"message":"Hello"}' });
    const t = vscode.window.createTerminal(`Nexarion: ${n}`); t.show(); t.sendText(`npx nexarioncli call ${n} '${a || "{}"}'`);
  }));
  context.subscriptions.push(vscode.commands.registerCommand('nexarion.showStats', () => {
    const t = vscode.window.createTerminal('Nexarion Stats'); t.show(); t.sendText('npx nexarioncli stats');
  }));
  context.subscriptions.push(vscode.commands.registerCommand('nexarion.healthCheck', async () => {
    try {
      const r = await (await fetch('http://localhost:3000/health')).json() as Record<string, unknown>;
      vscode.window.showInformationMessage(`Nexarion: ${r.agents} agents, ${r.tools} tools`);
    } catch { vscode.window.showErrorMessage('Server unreachable at http://localhost:3000'); }
  }));

  agentProvider.refresh();
}

class AgentTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _e = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._e.event;

  refresh() { this._e.fire(); }
  getTreeItem(el: vscode.TreeItem) { return el; }

  async getChildren(): Promise<vscode.TreeItem[]> {
    try {
      const r = await fetch('http://localhost:3000/agents');
      const agents = await r.json() as Array<Record<string, unknown>>;
      return agents.map(a => {
        const item = new vscode.TreeItem(a.name as string);
        item.description = `${a.skills} skills · ${a.status}`;
        item.iconPath = new vscode.ThemeIcon(a.status === 'online' ? 'debug-start' : 'debug-disconnect');
        return item;
      });
    } catch {
      return [new vscode.TreeItem('No agents — check server at :3000')];
    }
  }
}

export function deactivate() {}
