import * as path from "path";
import { commands, ShellExecution, TaskGroup, TaskPanelKind, TaskRevealKind, tasks, TaskScope, window } from "vscode";
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
        return await Act.runCommand(`${Act.base} ${eventTrigger}`);
    }

    static async runWorkflow(workflow: Workflow) {
        return await Act.runCommand(`${Act.base} ${Option.Workflows} '.github/workflows/${path.parse(workflow.uri.fsPath).base}'`, workflow);
    }

    static async runCommand(command: string, workflow?: Workflow) {

        const unreadyComponents = await ComponentManager.getUnreadyComponents();
        if (unreadyComponents.length > 0) {
            window.showErrorMessage(`The following required components are not ready: ${unreadyComponents.map(component => component.name).join(', ')}`, 'Fix...').then(async value => {
                if (value === 'Fix...') {
                    await commands.executeCommand('components.focus');
                }
            });
            return;
        }

        await tasks.executeTask({
            name: workflow?.name || 'act',
            detail: 'Run workflow',
            definition: { type: 'GitHub Local Actions' },
            source: 'GitHub Local Actions',
            scope: TaskScope.Workspace,
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
            execution: new ShellExecution(command)
        });
    }
}