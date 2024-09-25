import { MarkdownString, TreeItem } from "vscode";

export interface GithubLocalActionsTreeItem extends TreeItem {
    getChildren: () => GithubLocalActionsTreeItem[] | Promise<GithubLocalActionsTreeItem[]>;

    getToolTip?: () => Promise<MarkdownString | string | undefined>;
}