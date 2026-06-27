export const buildControlUrl = (controlToken: string) =>
  `${window.location.origin}/control/${controlToken}`

export const copyControlLink = async (controlToken: string) => {
  await navigator.clipboard.writeText(buildControlUrl(controlToken))
}
