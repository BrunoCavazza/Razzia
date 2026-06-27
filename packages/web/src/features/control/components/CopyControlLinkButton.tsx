import { copyControlLink } from "@razzia/web/features/control/utils/control-url"
import { Smartphone } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

interface Props {
  controlToken: string
  compact?: boolean
}

const CopyControlLinkButton = ({ controlToken, compact }: Props) => {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await copyControlLink(controlToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 rounded-md bg-black/40 px-3 py-2 text-sm font-semibold text-white hover:bg-black/55"
        aria-label={t("game:control.copyLink")}
      >
        <Smartphone className="size-4 shrink-0" aria-hidden />
        {copied ? t("game:control.linkCopied") : t("game:control.copyLink")}
      </button>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-white px-6 py-4 text-black">
      <p className="text-xl font-bold">{t("game:control.title")}</p>
      <p className="mt-1 max-w-xs text-center text-sm text-gray-600">
        {t("game:control.description")}
      </p>
      <button
        type="button"
        onClick={handleCopy}
        className="bg-primary mt-4 flex items-center gap-2 rounded-lg px-5 py-3 font-semibold text-white hover:brightness-105"
      >
        <Smartphone className="size-5" aria-hidden />
        {copied ? t("game:control.linkCopied") : t("game:control.copyLink")}
      </button>
    </div>
  )
}

export default CopyControlLinkButton
