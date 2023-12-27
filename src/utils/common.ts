import * as packageJSON from '../../package.json'
const { name, version } = packageJSON

export const getAppName = (): string|undefined => name
export const getVersion = (): string|undefined => version
export const createUniqueId = (): string => Math.random().toString(16).slice(2)