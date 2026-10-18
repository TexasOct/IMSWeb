import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ContactRoundIcon,
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
import { adminErrorMessage } from "~/lib/admin-error"
import {
  NAMECARD_CHARACTER_CATEGORIES,
  createAdminNamecardCharacter,
  deleteAdminNamecardCharacter,
  getAdminNamecardCharacterAgencies,
  getAdminNamecardCharacters,
  isApiError,
  updateAdminNamecardCharacter,
  type NamecardCharacter,
  type NamecardCharacterAgency,
  type NamecardCharacterCategory,
  type NamecardCharacterList,
} from "~/lib/api"
import { useDebouncedValue } from "~/lib/use-debounced-value"
import { CharacterEditorDialog } from "./character-editor-dialog"
import {
  NAMECARD_CHARACTER_CATEGORY_LABELS,
  NAMECARD_CHARACTER_CONFLICT_MESSAGE,
  buildCharacterCreateInput,
  buildCharacterUpdateInput,
  characterDraftFrom,
  emptyCharacterDraft,
  type CharacterDraft,
} from "./namecard-character-model"

const EMPTY_PAGE_INFO: NamecardCharacterList["pageInfo"] = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
}

const ALL_VALUE = "all"

const categoryItems = [
  { value: ALL_VALUE, label: "全部分类" },
  ...NAMECARD_CHARACTER_CATEGORIES.map((value) => ({
    value,
    label: NAMECARD_CHARACTER_CATEGORY_LABELS[value],
  })),
]

function isCategoryFilter(value: string | null): value is NamecardCharacterCategory {
  return NAMECARD_CHARACTER_CATEGORIES.some((category) => category === value)
}

export function meta() {
  return [{ title: "角色列表 | IMSWeb" }]
}

export default function AdminCardsCharactersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryParam = searchParams.get("query") ?? ""
  const agencyIdParam = searchParams.get("agencyId") ?? ALL_VALUE
  const rawCategory = searchParams.get("category")
  const categoryParam = isCategoryFilter(rawCategory) ? rawCategory : ALL_VALUE
  const requestedPage = Number(searchParams.get("page") ?? "1")
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1

  const [draftQuery, setDraftQuery] = useState(queryParam)
  const [draftAgency, setDraftAgency] = useState(agencyIdParam)
  const [draftCategory, setDraftCategory] = useState(categoryParam)

  const [characters, setCharacters] = useState<NamecardCharacter[]>([])
  const [pageInfo, setPageInfo] =
    useState<NamecardCharacterList["pageInfo"]>(EMPTY_PAGE_INFO)
  const [agencies, setAgencies] = useState<NamecardCharacterAgency[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorTarget, setEditorTarget] = useState<NamecardCharacter | null>(null)
  const [editorDraft, setEditorDraft] = useState<CharacterDraft>(
    emptyCharacterDraft(null)
  )
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<NamecardCharacter | null>(null)
  const [deleting, setDeleting] = useState(false)

  const applyResult = useCallback((result: NamecardCharacterList) => {
    setCharacters(result.characters)
    setPageInfo(result.pageInfo)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      applyResult(
        await getAdminNamecardCharacters({
          query: queryParam || undefined,
          agencyId:
            agencyIdParam === ALL_VALUE ? undefined : Number(agencyIdParam),
          category: categoryParam === ALL_VALUE ? undefined : categoryParam,
          page,
        }).send()
      )
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [applyResult, agencyIdParam, categoryParam, page, queryParam])

  useEffect(() => {
    let active = true
    getAdminNamecardCharacters({
      query: queryParam || undefined,
      agencyId: agencyIdParam === ALL_VALUE ? undefined : Number(agencyIdParam),
      category: categoryParam === ALL_VALUE ? undefined : categoryParam,
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
  }, [applyResult, agencyIdParam, categoryParam, page, queryParam])

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

  function selectCategory(value: string) {
    setDraftCategory(value)
    const next = new URLSearchParams(searchParams)
    if (value === ALL_VALUE) next.delete("category")
    else next.set("category", value)
    next.delete("page")
    setSearchParams(next)
  }

  function clearSearch() {
    setDraftQuery("")
    setDraftAgency(ALL_VALUE)
    setDraftCategory(ALL_VALUE)
    setSearchParams(new URLSearchParams())
  }

  function changePage(nextPage: number) {
    const next = new URLSearchParams(searchParams)
    if (nextPage <= 1) next.delete("page")
    else next.set("page", String(nextPage))
    setSearchParams(next)
  }

  function openCreate() {
    setEditorTarget(null)
    setEditorDraft(emptyCharacterDraft(agencies[0]?.id ?? null))
    setEditorOpen(true)
  }

  function openEdit(character: NamecardCharacter) {
    setEditorTarget(character)
    setEditorDraft(characterDraftFrom(character))
    setEditorOpen(true)
  }

  async function submitEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      if (editorTarget) {
        await updateAdminNamecardCharacter(
          editorTarget.id,
          buildCharacterUpdateInput(editorDraft, editorTarget.revision)
        ).send()
        toast.success("角色已更新")
      } else {
        await createAdminNamecardCharacter(
          buildCharacterCreateInput(editorDraft)
        ).send()
        toast.success("角色已新增")
      }
      setEditorOpen(false)
      await refresh()
    } catch (submitError) {
      if (
        isApiError(submitError) &&
        submitError.code === "NAMECARD_CHARACTER_STATE_CONFLICT"
      ) {
        toast.error(NAMECARD_CHARACTER_CONFLICT_MESSAGE)
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
      await deleteAdminNamecardCharacter(
        deleteTarget.id,
        deleteTarget.revision
      ).send()
      toast.success(`「${deleteTarget.nameCn}」已删除`)
      setDeleteTarget(null)
      await refresh()
    } catch (deleteError) {
      if (
        isApiError(deleteError) &&
        deleteError.code === "NAMECARD_CHARACTER_STATE_CONFLICT"
      ) {
        toast.error(NAMECARD_CHARACTER_CONFLICT_MESSAGE)
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
        eyebrow="NAMECARD CHARACTERS"
        title="角色列表"
        description="维护名片分类候选：企划、分类、名称与别名。"
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
              新增角色
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
        <label className="flex flex-col gap-1.5 lg:w-44">
          <span className="text-sm font-medium">分类</span>
          <Select
            items={categoryItems}
            value={draftCategory}
            disabled={loading}
            onValueChange={(value) => selectCategory(String(value))}
          >
            <SelectTrigger className={`${adminControlClass} w-full`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {categoryItems.map((item) => (
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
        title="角色目录"
        description={`共 ${pageInfo.total} 条记录，第 ${pageInfo.page} 页`}
        icon={ContactRoundIcon}
      >
        {loading ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>无法读取角色列表</AlertTitle>
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
        ) : characters.length === 0 ? (
          <AdminEmptyState
            icon={ContactRoundIcon}
            title="暂无角色条目"
            description="调整筛选条件，或新增一个角色条目。"
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>中文名</TableHead>
                  <TableHead>日文名</TableHead>
                  <TableHead>英文名</TableHead>
                  <TableHead>企划</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>别名</TableHead>
                  <TableHead>兜底</TableHead>
                  <TableHead>排序值</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {characters.map((character) => (
                  <TableRow key={character.id}>
                    <TableCell className="min-w-32 whitespace-normal font-medium">
                      {character.nameCn}
                    </TableCell>
                    <TableCell className="min-w-28 whitespace-normal">
                      {character.nameJa ?? "—"}
                    </TableCell>
                    <TableCell className="min-w-28 whitespace-normal">
                      {character.nameEn ?? "—"}
                    </TableCell>
                    <TableCell className="min-w-28 whitespace-normal">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="size-3 rounded-sm border"
                          style={{ backgroundColor: character.agencyColor }}
                          aria-hidden="true"
                        />
                        {character.agencyName}
                      </span>
                    </TableCell>
                    <TableCell>
                      {NAMECARD_CHARACTER_CATEGORY_LABELS[character.category]}
                    </TableCell>
                    <TableCell className="max-w-56 whitespace-normal text-sm text-muted-foreground">
                      {character.aliases ? (
                        <span className="line-clamp-2">{character.aliases}</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {character.isFallback ? (
                        <Badge variant="secondary">兜底</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{character.displayOrder}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={saving || deleting}
                          onClick={() => openEdit(character)}
                        >
                          <PencilIcon data-icon="inline-start" />
                          编辑
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={saving || deleting}
                          onClick={() => setDeleteTarget(character)}
                        >
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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

      <CharacterEditorDialog
        open={editorOpen}
        editing={editorTarget !== null}
        agencyLocked={editorTarget?.isFallback ?? false}
        agencies={agencies}
        draft={editorDraft}
        saving={saving}
        onChange={setEditorDraft}
        onOpenChange={setEditorOpen}
        onSubmit={submitEditor}
      />

      <ConfirmActionDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null)
        }}
        title="删除角色"
        description={
          deleteTarget
            ? `「${deleteTarget.nameCn}」将从名片分类候选中移除。此操作不可撤销。`
            : ""
        }
        submitting={deleting}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
