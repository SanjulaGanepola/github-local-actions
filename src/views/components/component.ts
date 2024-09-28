import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
import { CliStatus, Component, ExtensionStatus } from "../../componentManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class ComponentTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.component';
    component: Component<CliStatus | ExtensionStatus>;

    constructor(component: Component<CliStatus | ExtensionStatus>) {
        super(component.name, TreeItemCollapsibleState.None);
        this.component = component;
        this.description = component.version;
        this.contextValue = ComponentTreeItem.contextValue;
        this.iconPath = new ThemeIcon(component.icon);
        this.resourceUri = Uri.parse(`${ComponentTreeItem.contextValue}:${component.name}?status=${component.status}&required=${component.required}`, true);
        this.tooltip = `Name: ${component.name}\n` +
            `Status: ${component.status}\n` +
            (component.message ? `Message: ${component.message}` : ``);
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}