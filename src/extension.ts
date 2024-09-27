import * as vscode from 'vscode';
import { window } from 'vscode';
import ComponentsTreeDataProvider from './views/components/componentsTreeDataProvider';
import { DecorationProvider } from './views/decorationProvider';
import SettingsTreeDataProvider from './views/settings/settingsTreeDataProvider';
import WorkflowsTreeDataProvider from './views/workflows/workflowsTreeDataProvider';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "github-local-actions" is now active!');
	
	const decorationProvider = new DecorationProvider();

	const componentsTreeDataProvider = new ComponentsTreeDataProvider(context);
	const componentsTreeView = window.createTreeView(ComponentsTreeDataProvider.VIEW_ID, { treeDataProvider: componentsTreeDataProvider });
	const workflowsTreeDataProvider = new WorkflowsTreeDataProvider(context);
	const workflowsTreeView = window.createTreeView(WorkflowsTreeDataProvider.VIEW_ID, { treeDataProvider: workflowsTreeDataProvider });
	const settingsTreeDataProvider = new SettingsTreeDataProvider(context);
	const settingsTreeView = window.createTreeView(SettingsTreeDataProvider.VIEW_ID, { treeDataProvider: settingsTreeDataProvider });
	context.subscriptions.push(
		componentsTreeView,
		workflowsTreeView,
		settingsTreeView,
		window.registerFileDecorationProvider(decorationProvider)
	);
}

export function deactivate() { }
