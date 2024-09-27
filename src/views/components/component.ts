import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
import { Component } from "../../types";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class ComponentTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'component';
    component: Component;

    constructor(component: Component) {
        super(component.name, TreeItemCollapsibleState.None);
        this.component = component;
        this.contextValue = ComponentTreeItem.contextValue;
        this.iconPath = new ThemeIcon(component.icon);
        this.resourceUri = Uri.parse(`${ComponentTreeItem.contextValue}:${component.name}?status=${component.status}`, true);
        this.tooltip = `Name: ${component.name}\n` +
            `Status: ${component.status}\n` +
            (component.message ? `Message: ${component.message}` : ``);
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}