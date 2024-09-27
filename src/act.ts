import * as path from "path";
import { commands, ShellExecution, TaskGroup, TaskPanelKind, TaskRevealKind, tasks, window, workspace } from "vscode";
import { ComponentManager } from "./componentManager";
import { Workflow } from "./workflowManager";

export enum Options {
    Workflows = '-W'
}

export class Act {
    private static base: string = 'act';

    static async runAllWorkflows() {
        // TODO: Implement
    }

    static async runWorkflow(workflow: Workflow) {
        return await Act.runCommand(workflow, `${Act.base} ${Options.Workflows} '.github/workflows/${path.parse(workflow.uri.fsPath).base}'`);
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

        await tasks.executeTask({
            name: workflow.name,
            detail: 'Run workflow',
            definition: { type: 'GitHub Local Actions' },
            source: 'GitHub Local Actions',
            scope: workspace.getWorkspaceFolder(workflow.uri),
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