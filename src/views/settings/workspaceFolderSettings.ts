import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { act } from "../../extension";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
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

        const settings = await act.settingsManager.getSettings(this.workspaceFolder, false);
        items.push(...[
            new SecretsTreeItem(this.workspaceFolder, settings.secrets),
            new VariablesTreeItem(this.workspaceFolder, settings.variables),
            new InputsTreeItem(this.workspaceFolder, settings.inputs),
            new RunnersTreeItem(this.workspaceFolder, settings.runners)
        ]);

        return items;
    }
}