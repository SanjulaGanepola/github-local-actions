import { CancellationToken, EventEmitter, ExtensionContext, TreeDataProvider, TreeItem } from "vscode";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import { WorkflowManager } from "../workflowManager";
import WorkflowTreeItem from "./workflow";

export default class WorkflowsTreeDataProvider implements TreeDataProvider<GithubLocalActionsTreeItem> {
    private _onDidChangeTreeData = new EventEmitter<GithubLocalActionsTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    public static VIEW_ID = 'workflows';
    private workflowManager: WorkflowManager;

    constructor(context: ExtensionContext) {
        this.workflowManager = new WorkflowManager();
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