import * as child_process from "child_process";
import { extensions } from "vscode";

export interface Component<T extends CliStatus | ExtensionStatus> {
    name: string,
    icon: string,
    version?: string,
    status: T,
    information: string,
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

        const actCliInfo = await ComponentManager.getCliInfo('act', /act version (.+)/);
        components.push({
            name: 'nektos/act CLI',
            icon: 'terminal',
            version: actCliInfo.version,
            status: actCliInfo.status,
            information: 'https://github.com/nektos/act',
            required: true
        });

        // TODO: Fix docker status
        const dockerEngineVersion = '2.0.0';
        const dockerEngineStatus = CliStatus.Installed;
        components.push({
            name: 'Docker Engine',
            icon: 'dashboard',
            version: dockerEngineVersion,
            status: dockerEngineStatus,
            information: 'https://docs.docker.com/engine',
            required: true
        });

        const githubActionsInfo = await ComponentManager.getExtensionInfo('github.vscode-github-actions');
        components.push({
            name: 'GitHub Actions Extension',
            icon: 'extensions',
            version: githubActionsInfo.version,
            status: githubActionsInfo.status,
            information: 'https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-github-actions',
            required: false,
            message: 'GitHub Actions extension is not required, but is recommended to take advantage of workflow editor features.'
        });

        const githubCliInfo = await ComponentManager.getCliInfo('gh', /gh version (.+)/);
        components.push({
            name: 'GitHub CLI',
            icon: 'terminal',
            version: githubCliInfo.version,
            status: githubCliInfo.status,
            information: 'https://cli.github.com',
            required: false,
            message: 'GitHub CLI is not required, but is recommended if you plan to use it to retrieve GitHub tokens.'
        });

        return components;
    }

    static async getUnreadyComponents(): Promise<Component<CliStatus | ExtensionStatus>[]> {
        const components = await ComponentManager.getComponents();
        return components.filter(component => component.required && (component.status === CliStatus.NotInstalled || component.status === ExtensionStatus.NotActivated));
    }

    static async getCliInfo(component: string, versionRegex: RegExp): Promise<{ version?: string, status: CliStatus }> {
        return new Promise<{ version?: string, status: CliStatus }>((resolve, reject) => {
            child_process.exec(`${component} --version`, (error, stdout, stderr) => {
                if (error) {
                    resolve({
                        status: CliStatus.NotInstalled
                    });
                } else {
                    const version = stdout.match(versionRegex);

                    resolve({
                        version: version ? version[1] : undefined,
                        status: CliStatus.Installed
                    });
                }
            });
        });
    }

    static async getExtensionInfo(extensionId: string): Promise<{ version?: string, status: ExtensionStatus }> {
        const allExtensions = extensions.all;
        const extension = allExtensions.find(extension => extension.id === extensionId);

        if (extension) {
            if (!extension.isActive) {
                await extension.activate();
            }

            return {
                status: ExtensionStatus.Activated,
                version: extension.packageJSON.version
            }
        } else {
            return {
                status: ExtensionStatus.NotActivated
            }
        }
    }
}