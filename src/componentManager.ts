export interface Component {
    name: string,
    status: Status,
    icon: string,
    message?: string
}

export enum Status {
    Enabled = 'Enabled',
    Warning = 'Warning',
    Disabled = 'Disabled'
}

export class ComponentManager {
    components: Component[] = [
        {
            name: 'nektos/act',
            status: Status.Enabled,
            icon: 'package'
        },
        {
            name: 'Docker Engine',
            status: Status.Disabled,
            icon: 'dashboard'
        },
        {
            name: 'GitHub Actions Extension',
            status: Status.Warning,
            icon: 'extensions',
            message: 'GitHub Actions extension is not required but is recommended to take advantage of workflow editor features'
        },
        {
            name: 'GitHub CLI',
            status: Status.Warning,
            icon: 'terminal',
            message: 'GitHub CLI is not required but is recommended if you plan to use it to retrieve GitHub tokens'
        }
    ];

    async getComponents(): Promise<Component[]> {
        return this.components;
    }
}