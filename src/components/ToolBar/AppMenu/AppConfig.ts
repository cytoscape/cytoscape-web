
export interface AppConfig {
  name: string
  icon: string
  path: string
  exact?: boolean
  children?: AppConfig[]
}
