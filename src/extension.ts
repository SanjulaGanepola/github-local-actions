import * as vscode from 'vscode';
import { window } from 'vscode';
import ComponentTreeDataProvider from './views/component/componentTreeDataProvider';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "github-local-actions" is now active!');

	const componentTreeDataProvider = new ComponentTreeDataProvider(context);
	const componentTreeView = window.createTreeView(ComponentTreeDataProvider.VIEW_ID, { treeDataProvider: componentTreeDataProvider });
	context.subscriptions.push(
		componentTreeView
	);
}

export function deactivate() { }
