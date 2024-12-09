import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
import { CliStatus, Component, ExtensionStatus } from "../../componentsManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class ComponentTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.component';
    component: Component<CliStatus | ExtensionStatus>;

    constructor(component: Component<CliStatus | ExtensionStatus>) {
        super(component.name, TreeItemCollapsibleState.None);
        this.component = component;
        this.description = component.version ? `(${component.version}) - ${component.status}` : `${component.status}`;
        this.contextValue = `${ComponentTreeItem.contextValue}_${component.status}_${component.name}`;
        this.iconPath = new ThemeIcon(component.icon);
        this.resourceUri = Uri.parse(`${ComponentTreeItem.contextValue}:${component.name}?status=${component.status}&required=${component.required}`, true);
        this.tooltip = `Name: ${component.name}\n` +
            (component.path ? `Path: ${component.path}\n` : ``) +
            `Status: ${component.status}\n` +
            `Required: ${component.required ? 'Yes' : 'No'}\n` +
            (component.message ? `Message: ${component.message}` : ``);
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}