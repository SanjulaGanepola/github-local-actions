import { Uri } from "vscode"

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

export interface Workflow {
    name: string,
    uri: Uri,
    content?: any,
    error?: string
}