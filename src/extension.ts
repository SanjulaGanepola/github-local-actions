import * as vscode from 'vscode';
import { TreeCheckboxChangeEvent, window, workspace } from 'vscode';
import { Act } from './act';
import ComponentsTreeDataProvider from './views/components/componentsTreeDataProvider';
import { DecorationProvider } from './views/decorationProvider';
import { GithubLocalActionsTreeItem } from './views/githubLocalActionsTreeItem';
import HistoryTreeDataProvider from './views/history/historyTreeDataProvider';
import SettingTreeItem from './views/settings/setting';
import SettingsTreeDataProvider from './views/settings/settingsTreeDataProvider';
import WorkflowsTreeDataProvider from './views/workflows/workflowsTreeDataProvider';

export let act: Act;
export let componentsTreeDataProvider: ComponentsTreeDataProvider;
export let workflowsTreeDataProvider: WorkflowsTreeDataProvider;
export let historyTreeDataProvider: HistoryTreeDataProvider;
export let settingsTreeDataProvider: SettingsTreeDataProvider;

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "github-local-actions" is now active!');

	act = new Act(context);

	// Create tree views
	const decorationProvider = new DecorationProvider();
	componentsTreeDataProvider = new ComponentsTreeDataProvider(context);
	const componentsTreeView = window.createTreeView(ComponentsTreeDataProvider.VIEW_ID, { treeDataProvider: componentsTreeDataProvider });
	workflowsTreeDataProvider = new WorkflowsTreeDataProvider(context);
	const workflowsTreeView = window.createTreeView(WorkflowsTreeDataProvider.VIEW_ID, { treeDataProvider: workflowsTreeDataProvider });
	historyTreeDataProvider = new HistoryTreeDataProvider(context);
	const historyTreeView = window.createTreeView(HistoryTreeDataProvider.VIEW_ID, { treeDataProvider: historyTreeDataProvider });
	settingsTreeDataProvider = new SettingsTreeDataProvider(context);
	const settingsTreeView = window.createTreeView(SettingsTreeDataProvider.VIEW_ID, { treeDataProvider: settingsTreeDataProvider });
	settingsTreeView.onDidChangeCheckboxState(async (event: TreeCheckboxChangeEvent<GithubLocalActionsTreeItem>) => {
		await settingsTreeDataProvider.onDidChangeCheckboxState(event as TreeCheckboxChangeEvent<SettingTreeItem>);
	});

	// Create file watcher
	const workflowsFileWatcher = workspace.createFileSystemWatcher('**/.github/workflows/*.{yml,yaml}');
	workflowsFileWatcher.onDidCreate(() => {
		workflowsTreeDataProvider.refresh();
		settingsTreeDataProvider.refresh();
	});
	workflowsFileWatcher.onDidChange(() => {
		workflowsTreeDataProvider.refresh();
		settingsTreeDataProvider.refresh();
	});
	workflowsFileWatcher.onDidDelete(() => {
		workflowsTreeDataProvider.refresh();
		settingsTreeDataProvider.refresh();
	});

	context.subscriptions.push(
		componentsTreeView,
		workflowsTreeView,
		historyTreeView,
		settingsTreeView,
		window.registerFileDecorationProvider(decorationProvider),
		workflowsFileWatcher
	);
}

export function deactivate() { }
