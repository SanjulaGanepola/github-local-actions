export interface Component {
    name: string,
    icon: string,
    status: Status,
    required: boolean
    message?: string
}

export enum Status {
    Enabled = 'Enabled',
    Warning = 'Warning',
    Disabled = 'Disabled'
}

export class ComponentManager {
    static async getComponents(): Promise<Component[]> {
        return [
            {
                name: 'nektos/act',
                icon: 'package',
                status: Status.Enabled,
                required: true
            },
            {
                name: 'Docker Engine',
                icon: 'dashboard',
                status: Status.Enabled,
                required: true
            },
            {
                name: 'GitHub Actions Extension',
                icon: 'extensions',
                status: Status.Warning,
                required: false,
                message: 'GitHub Actions extension is not required, but is recommended to take advantage of workflow editor features.'
            },
            {
                name: 'GitHub CLI',
                icon: 'terminal',
                status: Status.Warning,
                required: false,
                message: 'GitHub CLI is not required, but is recommended if you plan to use it to retrieve GitHub tokens.'
            }
        ];
    }

    static async getUnreadyComponents(): Promise<Component[]> {
        const components = await ComponentManager.getComponents();
        return components.filter(component => component.required && component.status !== Status.Enabled);
    }
}