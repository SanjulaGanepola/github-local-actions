import { commands, env, ExtensionContext, TreeCheckboxChangeEvent, Uri, window, workspace } from 'vscode';
import { Act } from './act';
import { ConfigurationManager, Section } from './configurationManager';
import { IssueHandler } from './issueHandler';
import ComponentsTreeDataProvider from './views/components/componentsTreeDataProvider';
import { DecorationProvider } from './views/decorationProvider';
import { GithubLocalActionsTreeItem } from './views/githubLocalActionsTreeItem';
import HistoryTreeDataProvider from './views/history/historyTreeDataProvider';
import SettingTreeItem from './views/settings/setting';
import SettingsTreeDataProvider from './views/settings/settingsTreeDataProvider';
import WorkflowsTreeDataProvider from './views/workflows/workflowsTreeDataProvider';
import { WorkflowsManager } from './workflowsManager';

export let act: Act;
export let componentsTreeDataProvider: ComponentsTreeDataProvider;
export let workflowsTreeDataProvider: WorkflowsTreeDataProvider;
export let historyTreeDataProvider: HistoryTreeDataProvider;
export let settingsTreeDataProvider: SettingsTreeDataProvider;

export function activate(context: ExtensionContext) {
	console.log('Congratulations, your extension "github-local-actions" is now active!');

	act = new Act(context);

	// Create tree views
	const decorationProvider = new DecorationProvider();
	componentsTreeDataProvider = new ComponentsTreeDataProvider(context);
	const componentsTreeView = window.createTreeView(ComponentsTreeDataProvider.VIEW_ID, { treeDataProvider: componentsTreeDataProvider, showCollapseAll: true });
	workflowsTreeDataProvider = new WorkflowsTreeDataProvider(context);
	const workflowsTreeView = window.createTreeView(WorkflowsTreeDataProvider.VIEW_ID, { treeDataProvider: workflowsTreeDataProvider, showCollapseAll: true });
	historyTreeDataProvider = new HistoryTreeDataProvider(context);
	const historyTreeView = window.createTreeView(HistoryTreeDataProvider.VIEW_ID, { treeDataProvider: historyTreeDataProvider, showCollapseAll: true });
	settingsTreeDataProvider = new SettingsTreeDataProvider(context);
	const settingsTreeView = window.createTreeView(SettingsTreeDataProvider.VIEW_ID, { treeDataProvider: settingsTreeDataProvider, showCollapseAll: true });
	settingsTreeView.onDidChangeCheckboxState(async (event: TreeCheckboxChangeEvent<GithubLocalActionsTreeItem>) => {
		await settingsTreeDataProvider.onDidChangeCheckboxState(event as TreeCheckboxChangeEvent<SettingTreeItem>);
	});

	// Create file watcher
	let workflowsFileWatcher = setupFileWatcher(context);

	// Initialize configurations
	ConfigurationManager.initialize();
	workspace.onDidChangeConfiguration(async event => {
		if (event.affectsConfiguration(ConfigurationManager.group)) {
			await ConfigurationManager.initialize();

			if (event.affectsConfiguration(`${ConfigurationManager.group}.${Section.actCommand}`) ||
				event.affectsConfiguration(`${ConfigurationManager.group}.${Section.dockerDesktopPath}`)) {
				componentsTreeDataProvider.refresh();
			}

			if (event.affectsConfiguration(`${ConfigurationManager.group}.${Section.workflowsDirectory}`)) {
				workflowsTreeDataProvider.refresh();
				settingsTreeDataProvider.refresh();

				if (workflowsFileWatcher) {
					workflowsFileWatcher.dispose();
					workflowsFileWatcher = setupFileWatcher(context);
				}
			}
		}
	});

	context.subscriptions.push(
		componentsTreeView,
		workflowsTreeView,
		historyTreeView,
		settingsTreeView,
		window.registerFileDecorationProvider(decorationProvider),
		workflowsFileWatcher,
		commands.registerCommand('githubLocalActions.viewDocumentation', async () => {
			await env.openExternal(Uri.parse('https://sanjulaganepola.github.io/github-local-actions-docs'));
		}),
		commands.registerCommand('githubLocalActions.reportAnIssue', async () => {
			await IssueHandler.openBugReport(context);
		}),
	);
}

function setupFileWatcher(context: ExtensionContext) {
	const workflowsDirectory = WorkflowsManager.getWorkflowsDirectory();
	const workflowsFileWatcher = workspace.createFileSystemWatcher(`**/${workflowsDirectory}/*.{${WorkflowsManager.ymlExtension},${WorkflowsManager.yamlExtension}}`);
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

	return workflowsFileWatcher;
}

export function deactivate() { }
