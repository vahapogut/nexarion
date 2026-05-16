/**
 * Nexarion VS Code Extension
 *
 * Sidebar panel showing connected A2A agents and MCP tools.
 * Test tool calls directly from the command palette.
 */
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // Tree data provider for agents
  const agentProvider = new AgentTreeProvider();
  vscode.window.registerTreeDataProvider('nexarion-agents', agentProvider);

  // List agents command
  context.subscriptions.push(
    vscode.commands.registerCommand('nexarion.listAgents', () => {
      agentProvider.refresh();
      vscode.window.showInformationMessage('Nexarion: Agent list refreshed');
    })
  );

  // List tools command
  context.subscriptions.push(
    vscode.commands.registerCommand('nexarion.listTools', async () => {
      const terminal = vscode.window.createTerminal('Nexarion Tools');
      terminal.show();
      terminal.sendText('npx nexarioncli tools');
    })
  );

  // Call tool command
  context.subscriptions.push(
    vscode.commands.registerCommand('nexarion.callTool', async () => {
      const toolName = await vscode.window.showInputBox({ prompt: 'Tool name (e.g. a2a_weatheragent_forecast)' });
      if (!toolName) return;
      const args = await vscode.window.showInputBox({ prompt: 'Arguments (JSON)', value: '{"message":"Hello"}' });
      const terminal = vscode.window.createTerminal(`Nexarion: ${toolName}`);
      terminal.show();
      terminal.sendText(`npx nexarioncli call ${toolName} '${args || "{}"}'`);
    })
  );

  // Show stats
  context.subscriptions.push(
    vscode.commands.registerCommand('nexarion.showStats', () => {
      const terminal = vscode.window.createTerminal('Nexarion Stats');
      terminal.show();
      terminal.sendText('npx nexarioncli stats');
    })
  );
}

class AgentTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  refresh() { this._onDidChange.fire(); }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem { return element; }

  getChildren(): vscode.TreeItem[] {
    return [
      new AgentItem('A2A Agents', 'Run nexarion discover to add agents', vscode.TreeItemCollapsibleState.Expanded),
      new AgentItem('No agents connected', 'Use nexarion discover <url>', vscode.TreeItemCollapsibleState.None),
    ];
  }
}

class AgentItem extends vscode.TreeItem {
  constructor(label: string, desc: string, collapsible: vscode.TreeItemCollapsibleState) {
    super(label, collapsible);
    this.description = desc;
    this.iconPath = new vscode.ThemeIcon('plug');
  }
}

export function deactivate() {}
