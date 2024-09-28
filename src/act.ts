import * as child_process from 'child_process';
import * as path from "path";
import { commands, CustomExecution, EventEmitter, Pseudoterminal, TaskDefinition, TaskGroup, TaskPanelKind, TaskRevealKind, tasks, TaskScope, TerminalDimensions, window, workspace } from "vscode";
import { ComponentManager } from "./componentManager";
import { Workflow } from "./workflowManager";

export enum EventTrigger {
    BranchProtectionRule = 'branch_protection_rule',
    CheckRun = 'check_run',
    CheckSuite = 'check_suite',
    Create = 'create',
    Delete = 'delete',
    Deployment = 'deployment',
    DeploymentStatus = 'deployment_status',
    Discussion = 'discussion',
    DiscussionComment = 'discussion_comment',
    Fork = 'fork',
    Gollum = 'gollum',
    IssueComment = 'issue_comment',
    Issues = 'issues',
    Label = 'label',
    MergeGroup = 'merge_group',
    Milestone = 'milestone',
    PageBuild = 'page_build',
    Public = 'public',
    PullRequest = 'pull_request',
    PullRequestComment = 'pull_request_comment',
    PullRequestReview = 'pull_request_review',
    PullRequestReviewComment = 'pull_request_review_comment',
    PullRequestTarget = 'pull_request_target',
    Push = 'push',
    RegistryPackage = 'registry_package',
    Release = 'release',
    RepositoryDispatch = 'repository_dispatch',
    Schedule = 'schedule',
    Status = 'status',
    Watch = 'watch',
    WorkflowCall = 'workflow_call',
    WorkflowDispatch = 'workflow_dispatch',
    WorkflowRun = 'workflow_run'
}

export enum Option {
    Workflows = '-W'
}

export class Act {
    private static base: string = 'act';

    static async runAllWorkflows() {
        // TODO: Implement
    }

    static async runEvent(eventTrigger: EventTrigger) {
        // return await Act.runCommand(`${Act.base} ${eventTrigger}`);
    }

    static async runWorkflow(workflow: Workflow) {
        return await Act.runCommand(workflow, `${Act.base} ${Option.Workflows} ".github/workflows/${path.parse(workflow.uri.fsPath).base}"`);
    }

    static async runCommand(workflow: Workflow, command: string) {
        const unreadyComponents = await ComponentManager.getUnreadyComponents();
        if (unreadyComponents.length > 0) {
            window.showErrorMessage(`The following required components are not ready: ${unreadyComponents.map(component => component.name).join(', ')}`, 'Fix...').then(async value => {
                if (value === 'Fix...') {
                    await commands.executeCommand('components.focus');
                }
            });
            return;
        }

        const workspaceFolder = workspace.getWorkspaceFolder(workflow.uri);
        if (!workspaceFolder) {
            window.showErrorMessage('Failed to detect workspace folder');
            return;
        }

        await tasks.executeTask({
            name: workflow.name,
            detail: 'Run workflow',
            definition: { type: 'GitHub Local Actions' },
            source: 'GitHub Local Actions',
            scope: workspaceFolder || TaskScope.Workspace,
            isBackground: true,
            presentationOptions: {
                reveal: TaskRevealKind.Always,
                focus: false,
                clear: false,
                close: false,
                echo: true,
                panel: TaskPanelKind.Dedicated,
                showReuseMessage: false
            },
            problemMatchers: [],
            runOptions: {},
            group: TaskGroup.Build,
            execution: new CustomExecution(async (resolvedDefinition: TaskDefinition): Promise<Pseudoterminal> => {
                const writeEmitter = new EventEmitter<string>();
                const closeEmitter = new EventEmitter<number>();

                return {
                    onDidWrite: writeEmitter.event,
                    onDidClose: closeEmitter.event,
                    open: async (initialDimensions: TerminalDimensions | undefined): Promise<void> => {
                        writeEmitter.fire(`Workflow:    ${workflow.name}\r\n`);
                        writeEmitter.fire(`Path:        ${workflow.uri.fsPath}\r\n`);
                        writeEmitter.fire(`Command:     ${command}\r\n`);
                        writeEmitter.fire(`Environments: OSSBUILD\r\n`);
                        writeEmitter.fire(`Variables:   VARIABLE1=ABC, VARIABLE2=DEF\r\n`);
                        writeEmitter.fire(`Secrets:     SECRET1=ABC, SECRET2=DEF\r\n`);
                        writeEmitter.fire(`Timestamp:   ${new Date().toLocaleTimeString()}\r\n`);
                        writeEmitter.fire(`\r\n`);

                        const exec = child_process.spawn(command, { cwd: workspaceFolder.uri.fsPath, shell: '/usr/bin/bash' });
                        exec.stdout.on('data', (data) => {
                            const output = data.toString();
                            writeEmitter.fire(output);

                            if (output.includes('success')) {
                                window.showInformationMessage('Command succeeded!');
                            }
                        });

                        exec.stderr.on('data', (data) => {
                            const error = data.toString();
                            writeEmitter.fire(error);
                        });

                        exec.on('close', (code) => {
                            closeEmitter.fire(code || 0);
                        });
                    },

                    close: () => {
                        // TODO:
                    }
                };
            }
            )
        });
    }
}