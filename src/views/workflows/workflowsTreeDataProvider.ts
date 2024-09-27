import { CancellationToken, commands, EventEmitter, ExtensionContext, TreeDataProvider, TreeItem, window, workspace } from "vscode";
import { WorkflowManager } from "../../workflowManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import WorkflowTreeItem from "./workflow";

export default class WorkflowsTreeDataProvider implements TreeDataProvider<GithubLocalActionsTreeItem> {
    private _onDidChangeTreeData = new EventEmitter<GithubLocalActionsTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    public static VIEW_ID = 'workflows';
    private workflowManager: WorkflowManager;

    constructor(context: ExtensionContext) {
        this.workflowManager = new WorkflowManager();

        context.subscriptions.push(
            commands.registerCommand('githubLocalActions.refreshWorkflows', async () => {
                this.refresh();
            }),
            commands.registerCommand('githubLocalActions.openWorkflow', async (workflowTreeItem: WorkflowTreeItem) => {
                const document = await workspace.openTextDocument(workflowTreeItem.workflow.uri);
                await window.showTextDocument(document);
            }),
            commands.registerCommand('githubLocalActions.runWorkflow', async (workflowTreeItem: WorkflowTreeItem) => {

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
            const workflows = await this.workflowManager.getWorkflows();
            return workflows.map(workflow => new WorkflowTreeItem(workflow));
        }
    }
}