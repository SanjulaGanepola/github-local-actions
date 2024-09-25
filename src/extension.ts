import * as vscode from 'vscode';
import { window } from 'vscode';
import ComponentsTreeDataProvider from './views/components/componentsTreeDataProvider';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "github-local-actions" is now active!');

	const componentsTreeDataProvider = new ComponentsTreeDataProvider(context);
	const componentsTreeView = window.createTreeView(ComponentsTreeDataProvider.VIEW_ID, { treeDataProvider: componentsTreeDataProvider });
	context.subscriptions.push(
		componentsTreeView
	);
}

export function deactivate() { }
