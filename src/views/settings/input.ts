import { ThemeIcon, TreeItem, TreeItemCheckboxState, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { Input } from "../../settingsManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class InputTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.input';
    input: Input

    constructor(public workspaceFolder: WorkspaceFolder, input: Input) {
        super(input.key, TreeItemCollapsibleState.None);
        this.input = input;
        this.description = input.value;
        this.contextValue = InputTreeItem.contextValue;
        this.iconPath = new ThemeIcon('symbol-parameter');
        this.checkboxState = input.selected ? TreeItemCheckboxState.Checked : TreeItemCheckboxState.Unchecked;
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}