export interface Environment {

}

export interface Secret {
    key: string,
    value?: string
}

export interface Variable {
    key: string,
    value?: string
}

export class SettingsManager {
    environments: Environment[] = [];
    secrets: Secret[] = [];
    variables: Variable[] = [];
}