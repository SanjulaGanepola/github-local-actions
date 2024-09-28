import * as child_process from "child_process";
import { extensions } from "vscode";

export interface Component<T extends CliStatus | ExtensionStatus> {
    name: string,
    icon: string,
    status: T,
    required: boolean
    message?: string
}

export enum CliStatus {
    Installed = 'Installed',
    NotInstalled = 'Not Installed'
}

export enum ExtensionStatus {
    Activated = 'Activated',
    NotActivated = 'Not Activated'
}

export class ComponentManager {
    static async getComponents(): Promise<Component<CliStatus | ExtensionStatus>[]> {
        const components: Component<CliStatus | ExtensionStatus>[] = [];

        const actCliStatus = await ComponentManager.getCliStatus('act');
        components.push({
            name: 'nektos/act CLI',
            icon: 'terminal',
            status: actCliStatus,
            required: true
        });

        const dockerEngineStatus = CliStatus.Installed;
        components.push({
            name: 'Docker Engine',
            icon: 'dashboard',
            status: dockerEngineStatus,
            required: true
        });

        const githubActionsExtensionStatus = await ComponentManager.getExtensionStatus('github.vscode-github-actions');
        components.push({
            name: 'GitHub Actions Extension',
            icon: 'extensions',
            status: githubActionsExtensionStatus,
            required: false,
            message: 'GitHub Actions extension is not required, but is recommended to take advantage of workflow editor features.'
        });

        const isGithubCliInstalled = await ComponentManager.getCliStatus('gh');
        components.push({
            name: 'GitHub CLI',
            icon: 'terminal',
            status: isGithubCliInstalled,
            required: false,
            message: 'GitHub CLI is not required, but is recommended if you plan to use it to retrieve GitHub tokens.'
        });

        return components;
    }

    static async getUnreadyComponents(): Promise<Component<CliStatus | ExtensionStatus>[]> {
        const components = await ComponentManager.getComponents();
        return components.filter(component => component.required && (component.status === CliStatus.NotInstalled || component.status === ExtensionStatus.NotActivated));
    }

    static async getCliStatus(component: string): Promise<CliStatus> {
        return new Promise<CliStatus>((resolve, reject) => {
            child_process.exec(`${component} --version`, (error, stdout, stderr) => {
                if (error) {
                    resolve(CliStatus.NotInstalled);
                } else {
                    resolve(CliStatus.Installed);
                }
            });
        });
    }

    static async getExtensionStatus(extensionId: string): Promise<ExtensionStatus> {
        const allExtensions = extensions.all;
        const extension = allExtensions.find(extension => extension.id === extensionId);
        if (extension) {
            if (!extension.isActive) {
                await extension.activate();
            }

            return ExtensionStatus.Activated;
        } else {
            return ExtensionStatus.NotActivated;
        }
    }
}