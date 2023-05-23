import { Cx2 } from '../../../models/CxModel/Cx2'

interface QueryInteractionProps {
  uuid: string
}

export const queryInteraction = ({
  uuid,
}: QueryInteractionProps): Promise<Cx2> => {
  // return apiClient.get(`/organizations/${organizationId}`)
  // Fetch the CX2 from NDEx server

  // Dummy
  return fetch(`http://localhost:3000/cx2/${uuid}`).then((response) =>
    response.json(),
  )
}

// export const useOrganization = ({ organizationId }: GetOrganizationOptions) => {
//   const { data, isLoading } = useQuery({
//     queryKey: ['organizations', organizationId],
//     queryFn: () => getOrganization({ organizationId }),
//   })

//   return { data, isLoading }
// }
