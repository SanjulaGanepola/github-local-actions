import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { Input } from "../../settingsManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class InputTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.input';

    constructor(input: Input) {
        super(input.key, TreeItemCollapsibleState.None);
        this.description = input.value;
        this.contextValue = InputTreeItem.contextValue;
        this.iconPath = new ThemeIcon('symbol-parameter');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}