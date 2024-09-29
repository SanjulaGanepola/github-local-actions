import { CancellationToken, commands, EventEmitter, ExtensionContext, TreeDataProvider, TreeItem, window, workspace } from "vscode";
import { EventTrigger } from "../../act";
import { act } from "../../extension";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import WorkflowTreeItem from "./workflow";

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
                const event = await window.showQuickPick(Object.values(EventTrigger), {
                    title: 'Select the event to run',
                    placeHolder: 'Event'
                });

                if(event) {
                    await act.runEvent(event as EventTrigger);
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
            const workflows = await act.workflowsManager.getWorkflows();
            return workflows.map(workflow => new WorkflowTreeItem(workflow));
        }
    }
}