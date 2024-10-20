import { MarkdownString, TreeItem, WorkspaceFolder } from "vscode";

export interface GithubLocalActionsTreeItem extends TreeItem {
    workspaceFolder?: WorkspaceFolder;

    getChildren: () => GithubLocalActionsTreeItem[] | Promise<GithubLocalActionsTreeItem[]>;

    getToolTip?: () => Promise<MarkdownString | string | undefined>;
}