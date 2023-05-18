import { Aspect } from './Aspect'
import { CxDescriptor } from './CxDescriptor'
import { MetaData } from './MetaData'
import { Status } from './Status'

type Head = [CxDescriptor] | [CxDescriptor, MetaData]
type Tail = [Status] | [MetaData, Status]

export type Cx2 = [...Head, ...Aspect[], ...Tail]
