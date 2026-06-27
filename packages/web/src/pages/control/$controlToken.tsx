import ControlPanel from "@razzia/web/features/control/components/ControlPanel"
import { createFileRoute, useParams } from "@tanstack/react-router"

const ControlPage = () => {
  const { controlToken } = useParams({ from: "/control/$controlToken" })

  return <ControlPanel controlToken={controlToken} />
}

export const Route = createFileRoute("/control/$controlToken")({
  component: ControlPage,
})
