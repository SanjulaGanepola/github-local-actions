import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import ContainerEnginesTreeItem from "./containerEngines";
import EnvironmentsTreeItem from "./environments";
import InputsTreeItem from "./inputs";
import RunnersTreeItem from "./runners";
import SecretsTreeItem from "./secrets";
import VariablesTreeItem from "./variables";

export default class WorkspaceFolderSettingsTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.workspaceFolderSettings';

    constructor(public workspaceFolder: WorkspaceFolder) {
        super(workspaceFolder.name, TreeItemCollapsibleState.Collapsed);
        this.contextValue = WorkspaceFolderSettingsTreeItem.contextValue;
        this.iconPath = new ThemeIcon('folder');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        const items: GithubLocalActionsTreeItem[] = [];

        items.push(...[
            new EnvironmentsTreeItem(this.workspaceFolder),
            new SecretsTreeItem(this.workspaceFolder),
            new VariablesTreeItem(this.workspaceFolder),
            new InputsTreeItem(this.workspaceFolder),
            new RunnersTreeItem(this.workspaceFolder),
            new ContainerEnginesTreeItem(this.workspaceFolder)
        ]);

        return items;
    }
}