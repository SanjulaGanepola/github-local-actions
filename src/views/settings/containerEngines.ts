import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class ContainerEnginesTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.containerEngines';

    constructor() {
        super('Container Engines', TreeItemCollapsibleState.Collapsed);
        this.contextValue = ContainerEnginesTreeItem.contextValue;
        this.iconPath = new ThemeIcon('server-process');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}