import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { ContainerEngine } from "../../settingsManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class ContainerEngineTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.containerEngine';

    constructor(public workspaceFolder: WorkspaceFolder, containerEngine: ContainerEngine) {
        super(containerEngine.key, TreeItemCollapsibleState.None);
        this.description = containerEngine.value;
        this.contextValue = ContainerEngineTreeItem.contextValue;
        this.iconPath = new ThemeIcon('code');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}