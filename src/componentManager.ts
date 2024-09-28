export interface Component {
    name: string,
    icon: string,
    status: ComponentStatus,
    required: boolean
    message?: string
}

export enum ComponentStatus {
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
                status: ComponentStatus.Enabled,
                required: true
            },
            {
                name: 'Docker Engine',
                icon: 'dashboard',
                status: ComponentStatus.Enabled,
                required: true
            },
            {
                name: 'GitHub Actions Extension',
                icon: 'extensions',
                status: ComponentStatus.Warning,
                required: false,
                message: 'GitHub Actions extension is not required, but is recommended to take advantage of workflow editor features.'
            },
            {
                name: 'GitHub CLI',
                icon: 'terminal',
                status: ComponentStatus.Warning,
                required: false,
                message: 'GitHub CLI is not required, but is recommended if you plan to use it to retrieve GitHub tokens.'
            }
        ];
    }

    static async getUnreadyComponents(): Promise<Component[]> {
        const components = await ComponentManager.getComponents();
        return components.filter(component => component.required && component.status !== ComponentStatus.Enabled);
    }
}