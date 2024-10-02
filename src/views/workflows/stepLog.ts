import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { StepLog } from "../../act";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class StepLogTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.stepLog';
    stepLog: StepLog;

    constructor(stepLog: StepLog) {
        super(stepLog.name, TreeItemCollapsibleState.None);
        this.stepLog = stepLog;
        this.contextValue = StepLogTreeItem.contextValue;
        this.iconPath = new ThemeIcon('pass-filled');
        // this.tooltip = `Name: ${workflow.name}\n` +
        //     `Path: ${workflow.uri.fsPath}\n` +
        //     (workflow.error ? `Error: ${workflow.error}` : ``);

        // TODO: Add tooltip and resourceUri
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}