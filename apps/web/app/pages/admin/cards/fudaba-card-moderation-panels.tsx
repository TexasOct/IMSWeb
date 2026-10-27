import {
  CheckIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  XIcon,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { AdminEmptyState, AdminPanel } from "~/components/admin/admin-ui"
import { ConfirmActionDialog } from "~/components/shared/confirm-action-dialog"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Skeleton } from "~/components/ui/skeleton"
import {
  getAdminFudabaCardClaims,
  isApiError,
  reviewAdminFudabaCardClaim,
  type FudabaAdminCardClaim,
} from "~/lib/api"
import { useConfirmAction } from "~/pages/admin/hooks/use-confirm-action"
import { NamecardMediaPreview } from "./namecard-media-preview"

function staleReview(error: unknown) {
  return isApiError(error) && error.status === 409
}

function ModerationSkeleton() {
  return (
    <div
      className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-4"
      aria-label="正在载入审核队列"
    >
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  )
}

export function CardClaimReviewPanel() {
  const [items, setItems] = useState<FudabaAdminCardClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      setItems((await getAdminFudabaCardClaims().send()).items)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    void getAdminFudabaCardClaims()
      .send()
      .then((result) => {
        if (active) setItems(result.items)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const approve = useConfirmAction<FudabaAdminCardClaim>({
    onConfirm: async (item) => {
      try {
        await reviewAdminFudabaCardClaim(item.id, {
          decision: "approve",
          expectedRevision: item.revision,
          note: "已核对历史名片与申请资料",
        }).send()
        setItems((current) =>
          current.filter((candidate) => candidate.id !== item.id)
        )
      } catch (reviewError) {
        if (staleReview(reviewError)) await refresh()
        throw reviewError
      }
    },
    getTitle: () => "通过旧名片认领",
    getDescription: (item) =>
      `历史名片 #${item.legacyCardId} 将绑定给 ${item.claimant.displayName}，并成为可管理的注册名片。`,
    successMessage: (item) => `历史名片 #${item.legacyCardId} 已完成认领`,
  })
  const reject = useConfirmAction<FudabaAdminCardClaim>({
    onConfirm: async (item) => {
      try {
        await reviewAdminFudabaCardClaim(item.id, {
          decision: "reject",
          expectedRevision: item.revision,
          note: "无法确认历史名片归属",
        }).send()
        setItems((current) =>
          current.filter((candidate) => candidate.id !== item.id)
        )
      } catch (reviewError) {
        if (staleReview(reviewError)) await refresh()
        throw reviewError
      }
    },
    getTitle: () => "驳回旧名片认领",
    getDescription: (item) =>
      `历史名片 #${item.legacyCardId} 将保持未认领，不会绑定到申请帐号。`,
    successMessage: (item) => `历史名片 #${item.legacyCardId} 的认领已驳回`,
  })
  const busy = approve.submitting || reject.submitting

  return (
    <>
      <AdminPanel
        title="旧名片认领"
        description="核对公开旧名片、申请帐号和担当信息"
        icon={ShieldCheckIcon}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => void refresh()}
          >
            <RefreshCwIcon data-icon="inline-start" aria-hidden="true" />
            刷新
          </Button>
        }
      >
        {loading ? (
          <ModerationSkeleton />
        ) : error ? (
          <AdminEmptyState
            icon={ShieldCheckIcon}
            title="无法读取认领队列"
            description="请刷新后重试。"
          />
        ) : items.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-4">
            {items.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-lg border"
              >
                <NamecardMediaPreview
                  frontImageUrl={item.legacyCard.frontImageUrl}
                  backImageUrl={item.legacyCard.backImageUrl}
                  altBase={`历史名片 #${item.legacyCardId}`}
                />
                <div className="space-y-3 p-4">
                  <div>
                    <h3 className="font-medium">
                      历史名片 #{item.legacyCardId}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      申请人 {item.claimant.displayName} · 版本 {item.revision}
                    </p>
                  </div>
                  {item.message ? (
                    <p className="text-sm text-muted-foreground">
                      {item.message}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-1.5">
                    {item.favoriteCharacters.map((idol) => (
                      <Badge key={idol.id} variant="outline">
                        {idol.name}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="icon-sm"
                      aria-label="通过"
                      title="通过"
                      disabled={busy}
                      onClick={(event) =>
                        approve.requestAction(item, event.currentTarget)
                      }
                    >
                      {approve.submitting && approve.target?.id === item.id ? (
                        <LoaderCircleIcon
                          data-icon="inline-start"
                          className="animate-spin motion-reduce:animate-none"
                          aria-hidden="true"
                        />
                      ) : (
                        <CheckIcon
                          data-icon="inline-start"
                          aria-hidden="true"
                        />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      aria-label="驳回"
                      title="驳回"
                      disabled={busy}
                      onClick={(event) =>
                        reject.requestAction(item, event.currentTarget)
                      }
                    >
                      <XIcon data-icon="inline-start" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            icon={CheckIcon}
            title="没有待审核认领"
            description="用户提交的旧名片认领会显示在这里。"
          />
        )}
      </AdminPanel>
      <ConfirmActionDialog
        open={approve.open}
        onOpenChange={approve.onOpenChange}
        title={approve.title}
        description={approve.description}
        submitting={approve.submitting}
        onConfirm={() => void approve.confirmAction()}
        confirmLabel="确认认领"
        variant="default"
      />
      <ConfirmActionDialog
        open={reject.open}
        onOpenChange={reject.onOpenChange}
        title={reject.title}
        description={reject.description}
        submitting={reject.submitting}
        onConfirm={() => void reject.confirmAction()}
        confirmLabel="确认驳回"
        variant="default"
      />
    </>
  )
}
