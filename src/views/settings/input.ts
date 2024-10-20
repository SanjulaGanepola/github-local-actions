import { ThemeIcon, TreeItem, TreeItemCheckboxState, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { Input } from "../../settingsManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class InputTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.input';

    constructor(public workspaceFolder: WorkspaceFolder, input: Input) {
        super(input.key, TreeItemCollapsibleState.None);
        this.description = input.value;
        this.contextValue = InputTreeItem.contextValue;
        this.iconPath = new ThemeIcon('symbol-parameter');
        this.checkboxState = TreeItemCheckboxState.Unchecked;
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}