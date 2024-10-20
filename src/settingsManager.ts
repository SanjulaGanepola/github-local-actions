import { WorkspaceFolder } from "vscode";
import { Workflow } from "./workflowsManager";

export interface Settings {
    environments: Environment[],
    secrets: Secret[],
    variables: Variable[],
    inputs: Input[],
    runners: Runner[],
    containerEngines: ContainerEngine[]
}

export interface Environment {
    name: string
}

export interface Secret {
    key: string,
    value: string,
    selected: boolean
}

export interface Variable {
    key: string,
    value: string,
    selected: boolean
}

export interface Input {
    key: string,
    value: string,
    selected: boolean
}

export interface Runner {
    key: string,
    value: string,
    selected: boolean
}

export interface ContainerEngine {
    key: string,
    value: string,
    selected: boolean
}

export class SettingsManager {
    settings: { [path: string]: Settings }

    constructor() {
        this.settings = {};
    }

    getSettings(workspaceFolder: WorkspaceFolder) {
        if (!this.settings[workspaceFolder.uri.fsPath]) {
            this.settings[workspaceFolder.uri.fsPath] = {
                environments: [],
                secrets: [],
                variables: [],
                inputs: [],
                runners: [],
                containerEngines: [
                    {
                        key: 'DOCKER_HOST',
                        value: '',
                        selected: false
                    }
                ]
            }
        }

        return this.settings[workspaceFolder.uri.fsPath];
    }

    getEnvironments(workflow: Workflow): Environment[] {
        const environments: Environment[] = [];
        if (!workflow.yaml) {
            return environments;
        }

        const jobs = workflow.yaml?.jobs;
        if (jobs) {
            for (const details of Object.values<any>(jobs)) {
                if (details.environment) {
                    environments.push({
                        name: details.environment
                    });
                }
            }
        }

        return environments;
    }

    getSecrets(workflow: Workflow): Secret[] {
        const secrets: Secret[] = [];
        if (!workflow.fileContent) {
            return secrets;
        }

        return this.findInWorkflow(workflow.fileContent, /\${{\s*secrets\.(.*?)\s*}}/g);
    }

    getVariables(workflow: Workflow): Variable[] {
        const variables: Variable[] = [];
        if (!workflow.fileContent) {
            return variables;
        }

        return this.findInWorkflow(workflow.fileContent, /\${{\s*vars\.(.*?)(?:\s*==\s*(.*?))?\s*}}/g);
    }

    getInputs(workflow: Workflow): Input[] {
        const inputs: Variable[] = [];
        if (!workflow.fileContent) {
            return inputs;
        }

        return this.findInWorkflow(workflow.fileContent, /\${{\s*(?:inputs|github\.event\.inputs)\.(.*?)(?:\s*==\s*(.*?))?\s*}}/g);
    }

    editSecret(workspaceFolder: WorkspaceFolder, secret: Secret, newValue: string) {

    }

    editVariable(workspaceFolder: WorkspaceFolder, variable: Variable, newValue: string) {

    }

    editInput(workspaceFolder: WorkspaceFolder, input: Input, newValue: string) {

    }

    addRunner(workspaceFolder: WorkspaceFolder, runner: Runner) {

    }

    editContainerEngine(workspaceFolder: WorkspaceFolder, containerEngine: ContainerEngine, newValue: string) {

    }

    private findInWorkflow(content: string, regExp: RegExp) {
        const results: (Secret | Variable | Input)[] = [];

        const matches = content.matchAll(regExp);
        for (const match of matches) {
            results.push({ key: match[1], value: '', selected: false });
        }

        return results;
    }
}