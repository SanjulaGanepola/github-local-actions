import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { act } from "../../extension";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import WorkflowTreeItem from "./workflow";

export default class WorkspaceFolderWorkflowsTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.workspaceFolderWorkflows';

    constructor(public workspaceFolder: WorkspaceFolder) {
        super(workspaceFolder.name, TreeItemCollapsibleState.Collapsed);
        this.contextValue = WorkspaceFolderWorkflowsTreeItem.contextValue;
        this.iconPath = new ThemeIcon('folder');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        const items: GithubLocalActionsTreeItem[] = [];
        
        const workflows = await act.workflowsManager.getWorkflows(this.workspaceFolder);
        for (const workflow of workflows) {
            items.push(new WorkflowTreeItem(this.workspaceFolder, workflow));
        }

        return items;
    }
}