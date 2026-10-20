import {
  defineMapProvider,
  mapDraftValue,
  type MapConfig,
} from "../provider-definition"

export type MapboxConfig = Extract<MapConfig, { provider: "mapbox" }>

export const mapboxProvider = defineMapProvider<MapboxConfig>({
  id: "mapbox",
  label: "Mapbox",
  shortLabel: "Mapbox",
  preference: { overseas: 100 },
  matches: (config): config is MapboxConfig => config.provider === "mapbox",
  defaults: { accessToken: "", styleUrl: "" },
  fields: [
    {
      key: "accessToken",
      id: "map-source-mapbox-token",
      label: "Mapbox 公开 Token",
      description:
        "使用以 pk. 开头的公开 Token，用于底图和地图内地址／地名搜索；请配置允许的 URL，并确认 Geocoding API 可用。",
      maxLength: 2051,
    },
    {
      key: "styleUrl",
      id: "map-source-style-url",
      label: "地图样式地址",
      description:
        "单独使用官方 streets-v12、light-v11、outdoors-v12 时适配站点配色；国内外模式使用发布样式的栅格结果，请先发布所需配色与当地地名语言。Studio 自定义样式按原样使用。",
      maxLength: 2048,
      required: true,
    },
  ],
  readDraft: ({ accessToken, styleUrl }) => ({ accessToken, styleUrl }),
  toConfig: (draft) => ({
    provider: "mapbox",
    accessToken: mapDraftValue(draft, "accessToken"),
    styleUrl: mapDraftValue(draft, "styleUrl"),
  }),
  describe: (config) => config.styleUrl,
})
