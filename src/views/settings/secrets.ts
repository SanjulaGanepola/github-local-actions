import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { act } from "../../extension";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import SecretTreeItem from "./secret";

export default class SecretsTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.secrets';

    constructor() {
        super('Secrets', TreeItemCollapsibleState.Collapsed);
        this.contextValue = SecretsTreeItem.contextValue;
        this.iconPath = new ThemeIcon('lock');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        const workflows = await act.workflowsManager.getWorkflows();
        const secrets = [...new Set(workflows.map(workflow => act.settingsManager.getSecrets(workflow)).flat())];
        return secrets.map(secret => new SecretTreeItem(secret));
    }
}