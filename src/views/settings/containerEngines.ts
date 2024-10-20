import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { act } from "../../extension";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import ContainerEngineTreeItem from "./containerEngine";

export default class ContainerEnginesTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.containerEngines';

    constructor(public workspaceFolder: WorkspaceFolder) {
        super('Container Engines', TreeItemCollapsibleState.Collapsed);
        this.contextValue = ContainerEnginesTreeItem.contextValue;
        this.iconPath = new ThemeIcon('server-process');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        const items: GithubLocalActionsTreeItem[] = [];

        const containerEngines = act.settingsManager.getSettings(this.workspaceFolder).containerEngines;
        for (const containerEngine of containerEngines) {
            items.push(new ContainerEngineTreeItem(this.workspaceFolder, containerEngine));
        }

        return items;
    }
}