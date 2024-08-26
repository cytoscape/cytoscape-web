import { ComponentType } from './ComponentType'

export interface AppComponent {
  // Unique ID of the panel
  id: string

  // Type of component, either 'menu' or 'panel'
  type: ComponentType

  // The title to be used in the tab
  title: string

  // Actual component. Menu or Panel
  component: JSX.Element
}
