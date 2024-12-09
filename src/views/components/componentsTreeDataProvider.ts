import { CancellationToken, commands, env, EventEmitter, ExtensionContext, extensions, TreeDataProvider, TreeItem, Uri } from "vscode";
import { ConfigurationManager } from "../../configurationManager";
import { act } from "../../extension";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import ComponentTreeItem from "./component";

export default class ComponentsTreeDataProvider implements TreeDataProvider<GithubLocalActionsTreeItem> {
    private _onDidChangeTreeData = new EventEmitter<GithubLocalActionsTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    static VIEW_ID = 'components';

    constructor(context: ExtensionContext) {
        extensions.onDidChange(e => {
            this.refresh();
        });

        context.subscriptions.push(
            commands.registerCommand('githubLocalActions.refreshComponents', async () => {
                this.refresh();
            }),
            commands.registerCommand('githubLocalActions.information', async (componentTreeItem: ComponentTreeItem) => {
                await env.openExternal(Uri.parse(componentTreeItem.component.information));
            }),
            commands.registerCommand('githubLocalActions.installComponent', async (componentTreeItem: ComponentTreeItem) => {
                await componentTreeItem.component.installation();
            }),
            commands.registerCommand('githubLocalActions.startComponent', async (componentTreeItem: ComponentTreeItem) => {
                const start = componentTreeItem.component.start;
                if (start) {
                    await start();
                    this.refresh();
                }
            }),
            commands.registerCommand('githubLocalActions.fixPermissions', async (componentTreeItem: ComponentTreeItem) => {
                const fixPermissions = componentTreeItem.component.fixPermissions;
                if (fixPermissions) {
                    await fixPermissions();
                    this.refresh();
                }
            }),
            commands.registerCommand('githubLocalActions.openConfigFile', async (componentTreeItem: ComponentTreeItem) => {
                const openConfigFile = componentTreeItem.component.openConfigFile;
                if (openConfigFile) {
                    await openConfigFile();
                }
            }),
            commands.registerCommand('githubLocalActions.editSettings', async (componentTreeItem: ComponentTreeItem) => {
                const section = componentTreeItem.component.name === 'nektos/act' ? 'act' : 'dockerEngine';
                await commands.executeCommand('workbench.action.openSettings', ConfigurationManager.getSearchTerm(section as any));
            })
        );
    }

    refresh(element?: GithubLocalActionsTreeItem) {
        this._onDidChangeTreeData.fire(element);
    }

    getTreeItem(element: GithubLocalActionsTreeItem): GithubLocalActionsTreeItem | Thenable<GithubLocalActionsTreeItem> {
        return element;
    }

    async resolveTreeItem(item: TreeItem, element: GithubLocalActionsTreeItem, token: CancellationToken): Promise<GithubLocalActionsTreeItem> {
        if (element.getToolTip) {
            element.tooltip = await element.getToolTip();
        }

        return element;
    }

    async getChildren(element?: GithubLocalActionsTreeItem): Promise<GithubLocalActionsTreeItem[]> {
        if (element) {
            return element.getChildren();
        } else {
            const items: GithubLocalActionsTreeItem[] = [];

            const components = await act.componentsManager.getComponents();
            for (const component of components) {
                items.push(new ComponentTreeItem(component));
            }

            await commands.executeCommand('setContext', 'githubLocalActions:noComponents', items.length === 0);
            return items;
        }
    }
}