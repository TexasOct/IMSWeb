import { useState } from "react"
import { Button } from "~/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "~/components/ui/select"
import type { FudabaMapDeliverySnapshot, FudabaMapRouting } from "~/lib/api"
import {
  preferredMapSource,
  mapSourcesForRegion,
} from "~/lib/maps/provider-catalog"
import type { MapRoutingRegion } from "~/lib/maps/provider-definition"

export function MapRoutingEditor({
  snapshot,
  saving,
  onSave,
}: {
  snapshot: FudabaMapDeliverySnapshot
  saving: boolean
  onSave: (
    fallbackSourceId: string,
    routing: FudabaMapRouting | null
  ) => Promise<void>
}) {
  const [mode, setMode] = useState(snapshot.routing ? "regional" : "single")
  const [fallback, setFallback] = useState(snapshot.activeSourceId)
  const [mainland, setMainland] = useState(
    snapshot.routing?.mainlandSourceId ??
      preferredMapSource(snapshot.sources, "mainland") ??
      ""
  )
  const [overseas, setOverseas] = useState(
    snapshot.routing?.overseasSourceId ??
      preferredMapSource(snapshot.sources, "overseas") ??
      ""
  )
  const selectSource = (
    id: string,
    label: string,
    value: string,
    set: (value: string) => void,
    region?: MapRoutingRegion
  ) => (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next) set(next)
        }}
        disabled={saving}
      >
        <SelectTrigger id={id}>
          <SelectValue>
            {snapshot.sources.find((source) => source.id === value)?.name ??
              "请选择地图源"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(region
            ? mapSourcesForRegion(snapshot.sources, region)
            : snapshot.sources
          ).map((source) => (
            <SelectItem key={source.id} value={source.id}>
              {source.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
  return (
    <div className="space-y-5 border-b pb-5">
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="map-routing-mode">地图分发方式</FieldLabel>
          <Select
            value={mode}
            onValueChange={(value) => {
              if (value) setMode(value)
            }}
            disabled={saving}
          >
            <SelectTrigger id="map-routing-mode">
              <SelectValue>
                {mode === "regional" ? "国内外地图" : "统一地图源"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">统一地图源</SelectItem>
              <SelectItem value="regional">国内外地图</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {selectSource(
          "map-routing-fallback",
          mode === "regional" ? "统一模式地图源" : "默认地图源",
          fallback,
          setFallback
        )}
        {mode === "regional" ? (
          <>
            {selectSource(
              "map-routing-mainland",
              "中国大陆地图源",
              mainland,
              setMainland,
              "mainland"
            )}
            {selectSource(
              "map-routing-overseas",
              "海外地图源（含港澳台）",
              overseas,
              setOverseas,
              "overseas"
            )}
          </>
        ) : null}
      </FieldGroup>
      <FieldDescription>
        统一模式使用默认地图源。国内外模式在中国大陆使用高德，海外（含港澳台）使用
        Mapbox。海外配色和地名语言由 Mapbox 发布样式决定。保存后需重新加载地图。
      </FieldDescription>
      <Button
        type="button"
        variant="outline"
        disabled={
          saving ||
          !fallback ||
          (mode === "regional" && (!mainland || !overseas))
        }
        onClick={() =>
          void onSave(
            fallback,
            mode === "regional"
              ? { mainlandSourceId: mainland, overseasSourceId: overseas }
              : null
          )
        }
      >
        保存分发配置
      </Button>
    </div>
  )
}
