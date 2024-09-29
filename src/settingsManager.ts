import { Workflow } from "./workflowsManager";

export interface Environment {
    name: string
}

export interface Secret {
    key: string,
    value?: string
}

export interface Variable {
    key: string,
    value?: string
}

export interface Input {
    key: string,
    value?: string
}

export class SettingsManager {
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

    private findInWorkflow(content: string, regExp: RegExp) {
        const results: (Secret | Variable | Input)[] = [];

        const matches = content.matchAll(regExp);
        for (const match of matches) {
            results.push({ key: match[1] });
        }

        return results;
    }
}