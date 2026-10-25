import { Navigate, useParams } from "react-router"

import { AccountMePage } from "./account-me-page"
import { useDesktopAccountWorkspace } from "~/lib/use-desktop-account-workspace"

import { CommunityExchangeMeWorkspace } from "~/pages/community/exchange/me/community-exchange-me-workspace"
import {
  isProfileWorkspaceSection,
  profileWorkspaceSections,
} from "~/pages/community/exchange/me/profile-workspace-navigation"

export function meta({ params }: { params: { section?: string } }) {
  const section = profileWorkspaceSections.find(
    (item) => item.id === params.section
  )
  return [{ title: `${section?.label ?? "我的"} | IMSWeb` }]
}

export default function AccountMeSectionPage() {
  const { section } = useParams()
  const desktop = useDesktopAccountWorkspace()
  const requestedSection = section ?? null

  if (!isProfileWorkspaceSection(requestedSection)) {
    return <Navigate to="/account/me" replace />
  }

  if (desktop) return <AccountMePage section={requestedSection} />

  return (
    <CommunityExchangeMeWorkspace
      section={requestedSection}
      sectionBasePath="/account/me"
    />
  )
}
