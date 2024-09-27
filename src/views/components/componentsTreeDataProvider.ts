import { CancellationToken, commands, EventEmitter, ExtensionContext, TreeDataProvider, TreeItem } from "vscode";
import { ComponentManager } from "../componentManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import ComponentTreeItem from "./component";

export default class ComponentsTreeDataProvider implements TreeDataProvider<GithubLocalActionsTreeItem> {
    private _onDidChangeTreeData = new EventEmitter<GithubLocalActionsTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    public static VIEW_ID = 'components';
    private componentManager: ComponentManager;

    constructor(context: ExtensionContext) {
        this.componentManager = new ComponentManager();

        context.subscriptions.push(            
            commands.registerCommand('githubLocalActions.refreshComponents', async () => {
                this.refresh();
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
            const components = await this.componentManager.getComponents();
            return components.map(component => new ComponentTreeItem(component));
        }
    }
}