import * as path from "path";
import { CancellationToken, commands, EventEmitter, ExtensionContext, TreeDataProvider, TreeItem, window, workspace } from "vscode";
import { Event } from "../../act";
import { act } from "../../extension";
import { Utils } from "../../utils";
import { WorkflowsManager } from "../../workflowsManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import JobTreeItem from "./job";
import WorkflowTreeItem from "./workflow";
import WorkspaceFolderWorkflowsTreeItem from "./workspaceFolderWorkflows";

export default class WorkflowsTreeDataProvider implements TreeDataProvider<GithubLocalActionsTreeItem> {
    private _onDidChangeTreeData = new EventEmitter<GithubLocalActionsTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    static VIEW_ID = 'workflows';

    constructor(context: ExtensionContext) {
        context.subscriptions.push(
            commands.registerCommand('githubLocalActions.runAllWorkflows', async (workspaceFolderWorkflowsTreeItem?: WorkspaceFolderWorkflowsTreeItem) => {
                const workspaceFolder = await Utils.getWorkspaceFolder(workspaceFolderWorkflowsTreeItem?.workspaceFolder);
                if (workspaceFolder) {
                    await act.runAllWorkflows(workspaceFolder);
                }
            }),
            commands.registerCommand('githubLocalActions.runEvent', async (workspaceFolderWorkflowsTreeItem?: WorkspaceFolderWorkflowsTreeItem) => {
                const workspaceFolder = await Utils.getWorkspaceFolder(workspaceFolderWorkflowsTreeItem?.workspaceFolder);
                if (workspaceFolder) {
                    const event = await window.showQuickPick(Object.values(Event), {
                        title: 'Select the event to run',
                        placeHolder: 'Event'
                    });

                    if (event) {
                        await act.runEvent(workspaceFolder, event as Event);
                    }
                }
            }),
            commands.registerCommand('githubLocalActions.refreshWorkflows', async () => {
                this.refresh();
            }),
            commands.registerCommand('githubLocalActions.openWorkflow', async (workflowTreeItem: WorkflowTreeItem) => {
                try {
                    const document = await workspace.openTextDocument(workflowTreeItem.workflow.uri);
                    await window.showTextDocument(document);
                } catch (error: any) {
                    try {
                        await workspace.fs.stat(workflowTreeItem.workflow.uri);
                        window.showErrorMessage(`Failed to open workflow. Error: ${error}`);
                    } catch (error: any) {
                        window.showErrorMessage(`Workflow ${path.parse(workflowTreeItem.workflow.uri.fsPath).base} not found.`);
                    }
                }
            }),
            commands.registerCommand('githubLocalActions.runWorkflow', async (workflowTreeItem: WorkflowTreeItem) => {
                if (workflowTreeItem) {
                    await act.runWorkflow(workflowTreeItem.workspaceFolder, workflowTreeItem.workflow);
                } else {
                    let errorMessage: string | undefined;

                    const activeTextEditor = window.activeTextEditor;
                    if (activeTextEditor) {
                        const uri = activeTextEditor.document.uri;
                        const fileName = path.parse(uri.fsPath).base;
                        if (uri.path.match(`.*/${WorkflowsManager.WORKFLOWS_DIRECTORY}/.*\\.(${WorkflowsManager.YAML_EXTENSION}|${WorkflowsManager.YML_EXTENSION})`)) {
                            const workspaceFolder = workspace.getWorkspaceFolder(uri);
                            if (workspaceFolder) {
                                const workflows = await act.workflowsManager.getWorkflows(workspaceFolder);
                                const workflow = workflows.find(workflow => workflow.uri.fsPath === uri.fsPath);
                                if (workflow) {
                                    await act.runWorkflow(workspaceFolder, workflow);
                                } else {
                                    errorMessage = `Workflow not found in workflow directory (${WorkflowsManager.WORKFLOWS_DIRECTORY}).`;
                                }
                            } else {
                                errorMessage = `${fileName} must be opened in a workspace folder to be executed locally.`;
                            }
                        } else {
                            errorMessage = `${fileName} is not a workflow that can be executed locally.`;
                        }
                    } else {
                        errorMessage = 'No workflow opened to execute locally.';
                    }

                    if (errorMessage) {
                        window.showErrorMessage(errorMessage, 'View Workflows').then(async value => {
                            if (value === 'View Workflows') {
                                await commands.executeCommand('workflows.focus');
                            }
                        });
                    }
                }
            }),
            commands.registerCommand('githubLocalActions.runJob', async (jobTreeItem: JobTreeItem) => {
                await act.runJob(jobTreeItem.workspaceFolder, jobTreeItem.workflow, jobTreeItem.job);
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
            let noWorkflows: boolean = true;

            const workspaceFolders = workspace.workspaceFolders;
            if (workspaceFolders) {
                if (workspaceFolders.length === 1) {
                    items.push(...await new WorkspaceFolderWorkflowsTreeItem(workspaceFolders[0]).getChildren());

                    const workflows = await act.workflowsManager.getWorkflows(workspaceFolders[0]);
                    if (workflows && workflows.length > 0) {
                        noWorkflows = false;
                    }
                } else if (workspaceFolders.length > 1) {
                    for (const workspaceFolder of workspaceFolders) {
                        items.push(new WorkspaceFolderWorkflowsTreeItem(workspaceFolder));

                        const workflows = await act.workflowsManager.getWorkflows(workspaceFolder);
                        if (workflows && workflows.length > 0) {
                            noWorkflows = false;
                        }
                    }
                }
            }

            await commands.executeCommand('setContext', 'githubLocalActions:noWorkflows', noWorkflows);
            return items;
        }
    }
}