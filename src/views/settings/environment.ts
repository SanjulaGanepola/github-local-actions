import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { Environment } from "../../settingsManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class EnvironmentTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.environment';

    constructor(environment: Environment) {
        super(environment.name, TreeItemCollapsibleState.None);
        this.contextValue = EnvironmentTreeItem.contextValue;
        this.iconPath = new ThemeIcon('server');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}