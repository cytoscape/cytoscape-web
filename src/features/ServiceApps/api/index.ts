const serviceUrl = 'http://cd.ndexbio.org/cd/communitydetection/v1'

export const runCommunityDetection = async (): Promise<void> => {
  const result = await fetch(serviceUrl, {
    method: 'POST',
    body: JSON.stringify({
      algorithm: 'fakehcx',
      data: [],
    }),
  })

  console.log(result)
}

// const runLayout = (layoutName) => {
//     const layoutParams = {
//       algorithm: layoutName,
//       data: cx,
//     }
//     setLayoutRunningName(layoutName)
//     setLayoutRunning(true)
//     fetch('http://cytolayouts.ucsd.edu/cd/communitydetection/v1', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(layoutParams),
//     })
//       .then((res) => res.json())
//       .then(({ id }) => {
//         // poll `numCompletionTries`.
//         // If the task doesn't finish before then, give up

//         let numCompletionTries = 5
//         let waitForCompletion = async () => {
//           let result = await fetch(`http://cytolayouts.ucsd.edu/cd/communitydetection/v1/${id}`)
//           let resultJson = await result.json()

//           if (resultJson.status === 'complete') {
//             resultJson.result.forEach(({ node, x, y }) => {
//               cyReference.main.getElementById(node).position({ x, y })
//             })
//             setLayoutRunning(false)
//             setLayoutRunningName('')
//           } else {
//             if (numCompletionTries > 0) {
//               numCompletionTries--
//               // poll every second for completion
//               setTimeout(() => waitForCompletion(), 1000)
//             } else {
//               setLayoutRunning(false)
//               setLayoutRunningName('')
//             }
//           }
//         }

//         waitForCompletion()
//       })
//   }
