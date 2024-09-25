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