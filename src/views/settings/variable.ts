import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { Variable } from "../../settingsManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class VariableTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.variable';

    constructor(variable: Variable) {
        super(variable.key, TreeItemCollapsibleState.None);
        this.description = variable.value;
        this.contextValue = VariableTreeItem.contextValue;
        this.iconPath = new ThemeIcon('symbol-variable');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}