import { CancellationToken, commands, EventEmitter, ExtensionContext, TreeDataProvider, TreeItem, window, workspace } from "vscode";
import { Event } from "../../act";
import { act } from "../../extension";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import WorkflowTreeItem from "./workflow";
import WorkspaceFolderWorkflowsTreeItem from "./workspaceFolderWorkflows";

export default class WorkflowsTreeDataProvider implements TreeDataProvider<GithubLocalActionsTreeItem> {
    private _onDidChangeTreeData = new EventEmitter<GithubLocalActionsTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    static VIEW_ID = 'workflows';

    constructor(context: ExtensionContext) {
        context.subscriptions.push(
            commands.registerCommand('githubLocalActions.runAllWorkflows', async () => {
                await act.runAllWorkflows();
            }),
            commands.registerCommand('githubLocalActions.runEvent', async () => {
                const event = await window.showQuickPick(Object.values(Event), {
                    title: 'Select the event to run',
                    placeHolder: 'Event'
                });

                if (event) {
                    // TODO: Implement running event
                    // await act.runEvent(event as Event);
                }
            }),
            commands.registerCommand('githubLocalActions.refreshWorkflows', async () => {
                this.refresh();
            }),
            commands.registerCommand('githubLocalActions.openWorkflow', async (workflowTreeItem: WorkflowTreeItem) => {
                const document = await workspace.openTextDocument(workflowTreeItem.workflow.uri);
                await window.showTextDocument(document);
            }),
            commands.registerCommand('githubLocalActions.runWorkflow', async (workflowTreeItem: WorkflowTreeItem) => {
                await act.runWorkflow(workflowTreeItem.workflow);
            }),
            commands.registerCommand('githubLocalActions.runJob', async (workflowTreeItem: WorkflowTreeItem) => {
                // TODO: Implement running job
                // await act.runJob()
            })
        );
    }

    refresh(element?: GithubLocalActionsTreeItem) {
        this._onDidChangeTreeData.fire(element);
    }

    getTreeItem(element: GithubLocalActionsTreeItem): GithubLocalActionsTreeItem | Thenable<GithubLocalActionsTreeItem> {
        return element;
    }

    async resolveTreeItem(item: TreeItem, element: GithubLocalActionsTreeItem, token: CancellationToken): Promise<GithubLocalActionsTreeItem> {
        if (element.getToolTip) {
            element.tooltip = await element.getToolTip();
        }

        return element;
    }

    async getChildren(element?: GithubLocalActionsTreeItem): Promise<GithubLocalActionsTreeItem[]> {
        if (element) {
            return element.getChildren();
        } else {
            const items: GithubLocalActionsTreeItem[] = [];
            let noWorkflows: boolean = true;

            const workspaceFolders = workspace.workspaceFolders;
            if (workspaceFolders) {
                for (const workspaceFolder of workspaceFolders) {
                    items.push(new WorkspaceFolderWorkflowsTreeItem(workspaceFolder));

                    const workflows = await act.workflowsManager.getWorkflows(workspaceFolder);
                    if (workflows.length > 0) {
                        noWorkflows = false;
                    }
                }

            }

            await commands.executeCommand('setContext', 'githubLocalActions:noWorkflows', noWorkflows);
            return items;
        }
    }
}