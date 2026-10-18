import {
  ArrowLeftIcon,
  ArrowRightIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
} from "lucide-react"
import { useCallback, useEffect, useState, type FormEvent } from "react"
import { useSearchParams } from "react-router"
import { toast } from "sonner"

import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  adminControlClass,
} from "~/components/admin/admin-ui"
import { ConfirmActionDialog } from "~/components/shared/confirm-action-dialog"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { Skeleton } from "~/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { adminErrorMessage } from "~/lib/admin-error"
import {
  createAdminNamecardUnit,
  deleteAdminNamecardUnit,
  getAdminNamecardCharacterAgencies,
  getAdminNamecardCharacters,
  getAdminNamecardUnits,
  isApiError,
  updateAdminNamecardUnit,
  type NamecardCharacter,
  type NamecardCharacterAgency,
  type NamecardUnit,
  type NamecardUnitList,
} from "~/lib/api"
import { useDebouncedValue } from "~/lib/use-debounced-value"
import { UnitEditorDialog } from "./unit-editor-dialog"
import {
  NAMECARD_UNIT_CONFLICT_MESSAGE,
  buildUnitCreateInput,
  buildUnitUpdateInput,
  emptyUnitDraft,
  unitDraftFrom,
  type UnitDraft,
  type UnitMemberOption,
} from "./namecard-unit-model"

const EMPTY_PAGE_INFO: NamecardUnitList["pageInfo"] = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
}

const ALL_VALUE = "all"

export function meta() {
  return [{ title: "组合列表 | IMSWeb" }]
}

export default function AdminCardsUnitsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryParam = searchParams.get("query") ?? ""
  const agencyIdParam = searchParams.get("agencyId") ?? ALL_VALUE
  const requestedPage = Number(searchParams.get("page") ?? "1")
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1

  const [draftQuery, setDraftQuery] = useState(queryParam)
  const [draftAgency, setDraftAgency] = useState(agencyIdParam)

  const [units, setUnits] = useState<NamecardUnit[]>([])
  const [pageInfo, setPageInfo] =
    useState<NamecardUnitList["pageInfo"]>(EMPTY_PAGE_INFO)
  const [agencies, setAgencies] = useState<NamecardCharacterAgency[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorTarget, setEditorTarget] = useState<NamecardUnit | null>(null)
  const [editorDraft, setEditorDraft] = useState<UnitDraft>(emptyUnitDraft())
  const [editorMembers, setEditorMembers] = useState<
    NamecardCharacter[] | null
  >(null)
  const [editorMemberIndex, setEditorMemberIndex] = useState<
    Map<number, UnitMemberOption>
  >(() => new Map())
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<NamecardUnit | null>(null)
  const [deleting, setDeleting] = useState(false)

  const applyResult = useCallback((result: NamecardUnitList) => {
    setUnits(result.units)
    setPageInfo(result.pageInfo)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      applyResult(
        await getAdminNamecardUnits({
          query: queryParam || undefined,
          agencyId:
            agencyIdParam === ALL_VALUE ? undefined : Number(agencyIdParam),
          page,
        }).send()
      )
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [applyResult, agencyIdParam, page, queryParam])

  useEffect(() => {
    let active = true
    getAdminNamecardUnits({
      query: queryParam || undefined,
      agencyId: agencyIdParam === ALL_VALUE ? undefined : Number(agencyIdParam),
      page,
    })
      .send()
      .then((result) => {
        if (!active) return
        setError(false)
        applyResult(result)
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
  }, [applyResult, agencyIdParam, page, queryParam])

  useEffect(() => {
    let active = true
    getAdminNamecardCharacterAgencies()
      .send()
      .then((result) => {
        if (active) setAgencies(result.agencies)
      })
      .catch(() => {
        if (active) toast.error("企划列表加载失败，请稍后重试。")
      })
    return () => {
      active = false
    }
  }, [])

  const debouncedQuery = useDebouncedValue(draftQuery)

  // The keyword box drives the request on its own; `replace` keeps a burst of
  // typing out of the history stack.
  useEffect(() => {
    const trimmed = debouncedQuery.trim()
    if (trimmed === queryParam) return
    const next = new URLSearchParams(searchParams)
    if (trimmed) next.set("query", trimmed)
    else next.delete("query")
    next.delete("page")
    setSearchParams(next, { replace: true })
  }, [debouncedQuery, queryParam, searchParams, setSearchParams])

  /** Enter flushes the keyword immediately instead of waiting out the delay. */
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = draftQuery.trim()
    const next = new URLSearchParams(searchParams)
    if (trimmed) next.set("query", trimmed)
    else next.delete("query")
    next.delete("page")
    setSearchParams(next)
  }

  function selectAgency(value: string) {
    setDraftAgency(value)
    const next = new URLSearchParams(searchParams)
    if (value === ALL_VALUE) next.delete("agencyId")
    else next.set("agencyId", value)
    next.delete("page")
    setSearchParams(next)
  }

  function clearSearch() {
    setDraftQuery("")
    setDraftAgency(ALL_VALUE)
    setSearchParams(new URLSearchParams())
  }

  function changePage(nextPage: number) {
    const next = new URLSearchParams(searchParams)
    if (nextPage <= 1) next.delete("page")
    else next.set("page", String(nextPage))
    setSearchParams(next)
  }

  /**
   * Grows the label lookup instead of replacing it, so a checked member stays
   * resolvable after a later search narrows the visible candidates to others.
   */
  const rememberMembers = useCallback((members: UnitMemberOption[]) => {
    setEditorMemberIndex((previous) => {
      const next = new Map(previous)
      let added = false
      for (const member of members) {
        if (next.has(member.id)) continue
        next.set(member.id, member)
        added = true
      }
      return added ? next : previous
    })
  }, [])

  const loadEditorMembers = useCallback(
    async (query: string) => {
      try {
        const result = await getAdminNamecardCharacters({
          query: query || undefined,
          pageSize: 100,
        }).send()
        setEditorMembers(result.characters)
        rememberMembers(
          result.characters.map((character) => ({
            id: character.id,
            nameCn: character.nameCn,
            nameJa: character.nameJa,
            nameEn: character.nameEn,
          }))
        )
      } catch {
        setEditorMembers([])
        toast.error("角色候选加载失败，请稍后重试。")
      }
    },
    [rememberMembers]
  )

  /** Stable so the dialog's debounced search effect does not re-fire per render. */
  const searchEditorMembers = useCallback(
    (query: string) => void loadEditorMembers(query),
    [loadEditorMembers]
  )

  function openCreate() {
    setEditorTarget(null)
    setEditorDraft(emptyUnitDraft())
    setEditorMembers(null)
    searchEditorMembers("")
    setEditorOpen(true)
  }

  function openEdit(unit: NamecardUnit) {
    setEditorTarget(unit)
    setEditorDraft(unitDraftFrom(unit))
    rememberMembers(
      unit.members.map((member) => ({
        id: member.characterId,
        nameCn: member.nameCn,
        nameJa: member.nameJa,
        nameEn: member.nameEn,
      }))
    )
    setEditorMembers(null)
    searchEditorMembers("")
    setEditorOpen(true)
  }

  async function submitEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      if (editorTarget) {
        await updateAdminNamecardUnit(
          editorTarget.id,
          buildUnitUpdateInput(editorDraft, editorTarget.revision)
        ).send()
        toast.success("组合已更新")
      } else {
        await createAdminNamecardUnit(
          buildUnitCreateInput(editorDraft)
        ).send()
        toast.success("组合已新增")
      }
      setEditorOpen(false)
      await refresh()
    } catch (submitError) {
      if (
        isApiError(submitError) &&
        submitError.code === "NAMECARD_UNIT_STATE_CONFLICT"
      ) {
        toast.error(NAMECARD_UNIT_CONFLICT_MESSAGE)
        setEditorOpen(false)
        await refresh()
      } else if (
        isApiError(submitError) &&
        (submitError.status === 400 || submitError.status === 409)
      ) {
        toast.error(submitError.message || "保存失败，请检查名称是否重复。")
      } else {
        toast.error(adminErrorMessage(submitError))
      }
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try {
      await deleteAdminNamecardUnit(
        deleteTarget.id,
        deleteTarget.revision
      ).send()
      toast.success(`「${deleteTarget.nameCn}」已删除`)
      setDeleteTarget(null)
      await refresh()
    } catch (deleteError) {
      if (
        isApiError(deleteError) &&
        deleteError.code === "NAMECARD_UNIT_STATE_CONFLICT"
      ) {
        toast.error(NAMECARD_UNIT_CONFLICT_MESSAGE)
        setDeleteTarget(null)
        await refresh()
      } else {
        toast.error(adminErrorMessage(deleteError))
      }
    } finally {
      setDeleting(false)
    }
  }

  const agencyItems = [
    { value: ALL_VALUE, label: "全部企划" },
    ...agencies.map((agency) => ({
      value: String(agency.id),
      label: agency.name,
    })),
  ]

  return (
    <div className="flex min-w-0 flex-col gap-7">
      <AdminPageHeader
        eyebrow="NAMECARD UNITS"
        title="组合列表"
        description="维护名片组合候选：名称、所属企划与成员。"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => void refresh()}
            >
              <RefreshCwIcon data-icon="inline-start" />
              刷新
            </Button>
            <Button type="button" disabled={saving} onClick={openCreate}>
              <PlusIcon data-icon="inline-start" />
              新增组合
            </Button>
          </div>
        }
      />

      <form
        className="flex flex-col gap-3 lg:flex-row lg:items-end"
        onSubmit={submitSearch}
      >
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-sm font-medium">关键字</span>
          <Input
            value={draftQuery}
            placeholder="搜索中文名 / 日文名 / 英文名 / 别名"
            className={adminControlClass}
            disabled={loading}
            onChange={(event) => setDraftQuery(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 lg:w-56">
          <span className="text-sm font-medium">企划</span>
          <Select
            items={agencyItems}
            value={draftAgency}
            disabled={loading}
            onValueChange={(value) => selectAgency(String(value))}
          >
            <SelectTrigger className={`${adminControlClass} w-full`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {agencyItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={clearSearch}
          >
            清空
          </Button>
        </div>
      </form>

      <AdminPanel
        title="组合目录"
        description={`共 ${pageInfo.total} 条记录，第 ${pageInfo.page} 页`}
        icon={LayersIcon}
      >
        {loading ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>无法读取组合列表</AlertTitle>
            <AlertDescription>
              请确认管理会话有效，然后重试。
            </AlertDescription>
            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refresh()}
              >
                重试
              </Button>
            </div>
          </Alert>
        ) : units.length === 0 ? (
          <AdminEmptyState
            icon={LayersIcon}
            title="暂无组合条目"
            description="调整筛选条件，或新增一个组合条目。"
          />
        ) : (
          <TooltipProvider>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>中文名</TableHead>
                    <TableHead>日文名</TableHead>
                    <TableHead>英文名</TableHead>
                    <TableHead>所属企划</TableHead>
                    <TableHead>成员数</TableHead>
                    <TableHead>排序值</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((unit) => {
                    const memberNames = unit.members
                      .map((member) => member.nameCn)
                      .join("、")
                    return (
                      <TableRow key={unit.id}>
                        <TableCell className="min-w-32 whitespace-normal font-medium">
                          {unit.nameCn}
                        </TableCell>
                        <TableCell className="min-w-28 whitespace-normal">
                          {unit.nameJa ?? "—"}
                        </TableCell>
                        <TableCell className="min-w-28 whitespace-normal">
                          {unit.nameEn ?? "—"}
                        </TableCell>
                        <TableCell className="min-w-40 whitespace-normal">
                          {unit.agencies.length === 0 ? (
                            "—"
                          ) : (
                            <span className="flex flex-wrap gap-1">
                              {unit.agencies.map((agency) => (
                                <Badge
                                  key={agency.id}
                                  variant="secondary"
                                  className="gap-1.5"
                                >
                                  <span
                                    className="size-2.5 rounded-sm border"
                                    style={{ backgroundColor: agency.color }}
                                    aria-hidden="true"
                                  />
                                  {agency.name}
                                </Badge>
                              ))}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {unit.members.length === 0 ? (
                            "—"
                          ) : (
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-auto px-2"
                                    aria-label={`查看 ${unit.nameCn} 的成员名单`}
                                  >
                                    {unit.members.length} 人
                                  </Button>
                                }
                              />
                              <TooltipContent className="max-w-xs block">
                                <span className="block whitespace-normal leading-5">
                                  {memberNames}
                                </span>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell>{unit.displayOrder}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={saving || deleting}
                              onClick={() => openEdit(unit)}
                            >
                              <PencilIcon data-icon="inline-start" />
                              编辑
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              disabled={saving || deleting}
                              onClick={() => setDeleteTarget(unit)}
                            >
                              删除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </TooltipProvider>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            第 {pageInfo.page} / {Math.max(1, pageInfo.totalPages)} 页
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || pageInfo.page <= 1}
              onClick={() => changePage(pageInfo.page - 1)}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              上一页
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || !pageInfo.hasNextPage}
              onClick={() => changePage(pageInfo.page + 1)}
            >
              下一页
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </AdminPanel>

      <UnitEditorDialog
        open={editorOpen}
        editing={editorTarget !== null}
        agencies={agencies}
        draft={editorDraft}
        saving={saving}
        memberCandidates={editorMembers}
        memberIndex={editorMemberIndex}
        onChange={setEditorDraft}
        onMemberSearch={searchEditorMembers}
        onOpenChange={setEditorOpen}
        onCancel={() => setEditorOpen(false)}
        onSubmit={submitEditor}
      />

      <ConfirmActionDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null)
        }}
        title="删除组合"
        description={
          deleteTarget
            ? `「${deleteTarget.nameCn}」将从名片组合候选中移除。此操作不可撤销。`
            : ""
        }
        submitting={deleting}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
