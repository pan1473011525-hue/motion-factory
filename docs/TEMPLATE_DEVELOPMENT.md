# Motioner 模板开发指南

Motioner 1.3 采用“源码模板 + Manifest + Schema + 运行时注册”。新增模板不会重写应用主体，但需要把模板源码加入仓库、通过回归并重新构建 Motioner。应用故意不加载任意外部 JavaScript，以免个人素材被第三方脚本读取或执行系统命令。日常自由组合不需要新增模板，可直接使用 Composer 组件与动效库。

## 1. 一个模板由什么组成

每个模板至少包含：

1. `src/templates/<template-id>/manifest.ts`：身份、版本、Zod Schema、默认值、检查器字段、时长模式、能力、样式预设和迁移。
2. React/Remotion 组件：建议放在 `src/remotion/Templates.tsx`，复杂模板可拆成独立文件。
3. `src/templates/catalog.ts` 注册：供模板库、项目打开与迁移使用。
4. `src/templates/definitions.tsx` 注册：供 Player、Composer 模板场景节点与导出进程实例化组件。
5. 自动化用例与视觉关键帧：模板目录测试、默认值测试、首/中/末帧静帧。

`packages/template-sdk/src/index.ts` 是稳定协议层，不要让模板直接依赖 Electron。

## 2. 创建 Manifest

优先运行脚手架；它会生成模板目录、组件骨架并同时更新 catalog/runtime 注册点：

```bash
pnpm template:new -- --id=example --name="示例模板" --category=data
```

可先加 `--dry-run=true` 只预览计划。生成后再完善 Schema、默认参数、检查器字段和画面实现。

目录与 ID 使用小写短横线，版本使用语义化版本。最小示意：

```tsx
import {zColor} from "@remotion/zod-types";
import {z} from "zod";
import {defineTemplateManifest} from "../../../packages/template-sdk/src";

const schema = z.object({
  title: z.string().trim().min(1).max(40),
  value: z.number().finite(),
  accentColor: zColor(),
  stylePreset: z.enum(["editorial", "minimal", "sport"]),
});

export type ExampleProps = z.infer<typeof schema>;

export const exampleManifest = defineTemplateManifest<ExampleProps>({
  id: "example",
  compositionId: "Example",
  version: "1.0.0",
  name: "示例模板",
  category: "data",
  tags: ["示例", "数字"],
  description: "一句话说明使用场景。",
  schema,
  defaultProps: {
    title: "示例标题",
    value: 100,
    accentColor: "#47A7FF",
    stylePreset: "editorial",
  },
  fields: [
    {key: "title", label: "标题", section: "content", control: "text", maxLength: 40},
    {key: "value", label: "数值", section: "data", control: "number"},
    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [
      {label: "编辑部", value: "editorial"},
      {label: "极简", value: "minimal"},
      {label: "高对比", value: "sport"},
    ]},
    {key: "accentColor", label: "强调色", section: "style", control: "color"},
  ],
  durationMode: "fixed-edges",
  capabilities: {
    alpha: true,
    audio: false,
    mediaSlots: 0,
    minDurationFrames: 75,
    maxDurationFrames: 18_000,
    supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"],
  },
  stylePresets: [
    {id: "editorial", name: "编辑部", patch: {stylePreset: "editorial", accentColor: "#47A7FF"}},
    {id: "minimal", name: "极简", patch: {stylePreset: "minimal", accentColor: "#FFFFFF"}},
    {id: "sport", name: "高对比", patch: {stylePreset: "sport", accentColor: "#B8FF3D"}},
  ],
  migrations: [],
  preview: {accent: "#47A7FF", label: "100"},
});
```

可用检查器控件：`text`、`textarea`、`number`、`color`、`select`、`boolean`、`data-array` 和 `media`。字段 key 必须存在于 `defaultProps`；默认值必须通过 Schema。

## 3. 选择时长模型

- `stretch`：动画按总时长归一化，适合整段持续变化。
- `fixed-edges`：入场/退场固定，中间持有，最适合字幕条与资料卡。
- `loop`：入场后循环，适合装饰动效。
- `paginate`：按时长分页，适合排名、时间线和大数据列表。

使用 `getFixedEdgesTimeline()`、`getLoopFrame()`、`getPagination()` 和 `getNormalizedProgress()`，避免在组件里创建计时器。所有运动必须由 `useCurrentFrame()` 与 `useVideoConfig()` 推导；禁止 `Date.now()`、`Math.random()`、`setTimeout()`、`requestAnimationFrame()` 和不可重复的网络请求。

## 4. 使用共享原语

优先复用 `src/remotion/primitives.tsx`：

- 布局：`AlphaSurface`、`SafeArea`、`TextFit`。
- 动效：`EntranceExit`、`AnimatedNumber`、`RevealText`、`StaggerGroup`。
- 图表：`Axis`、`GridLines`、`BarMark`、`LinePath`、`DonutArc`、`Legend`。
- 信息：`DataLabel`、`SourceFooter`。
- 素材：`MediaSlot`、`MediaAssetProvider`。
- 主题：`ThemeProvider`、`useMotionTheme`、`useCanvasUnit`、`useMotionSettings`。

共享动效原语会自动响应全局速度、边缘帧数和“减少动效”。不要在模板里硬编码只适用于 1920×1080 的字体与间距；通过 `useCanvasUnit()` 按短边缩放。

媒体只接受项目资产 ID，不直接让用户输入 URL。`MediaSlot` 负责图像/视频、焦点、适配、缩放、圆角、视频入/出点、速度和结束策略，并由打包内本地白名单素材服务器提供给渲染器。

## 5. 版本升级与迁移

一旦项目可能保存，不能在不升版本的情况下改变旧字段语义。例：从 `1.0.0` 新增 `prefix`：

```ts
migrations: [{
  from: "1.0.0",
  to: "1.1.0",
  migrate: (raw) => schema.parse({...raw as object, prefix: ""}),
}]
```

迁移必须逐版连通到当前版本，并最终通过当前 Schema。禁止原地改写用户项目；项目打开成功后只在内存升级，下一次保存时写入新版本。

## 6. 注册模板

在 `src/templates/catalog.ts` 导入 Manifest 并加入 `templateCatalog`；在 `src/templates/definitions.tsx` 导入组件和 Manifest，再加入 `runtimeTemplates`。两处 ID 必须唯一且一致。脚手架会使用文件内的 `motioner-scaffold:*` 标记自动完成这些注册；标记缺失时会明确失败，不会静默生成未注册模板。

若模板需要新通用能力，先扩展 Template SDK 或共享原语，并给协议层添加测试；不要在检查器里针对模板 ID 写专用分支。

## 7. 新增 Composer 组件或动效

模板适合固定版式和强约束数据；可重复搭配的单一元素应加入 Composer：

1. 在 `packages/project-model/src/index.ts` 的组件或动效 ID 枚举中加入稳定 ID。
2. 组件在 `src/composer/registry.ts` 定义名称、分类、说明、Zod Schema、默认 props、默认尺寸和检查器字段。
3. 在 `src/composer/runtime.tsx` 增加对应的确定性渲染分支；媒体继续使用项目资产 ID 与 `MediaSlot`。
4. 新动效同时在注册表声明适用阶段，并在 `getComposerMotionStyle()` 中用 `interpolate()`、`spring()` 或帧函数实现。
5. 更新注册表/动效单元测试、Composer 三画幅视觉回归和真实导出场景，再重新生成 DMG。

组件 props 与节点变换会进入项目 v2，已发布 ID 不应改变语义。若必须重构字段，需要先为 Composer 节点设计迁移，不能让旧项目静默失效。

## 8. 发布门槛

```bash
pnpm check
pnpm remotion:bundle
pnpm visual:build-tool
pnpm visual:keyframes
pnpm visual:aspects
pnpm visual:composer
pnpm test:exports
pnpm package:mac
pnpm verify:package
```

每个模板至少检查 0%、入场中、入场末、持有中、退场中、末帧。含分页模板还要覆盖页切换；含媒体模板要覆盖真实本地素材、缺失素材和超长文字。导出测试必须同时覆盖 ProRes 4444、4444 XQ、PNG RGBA 与 H.264。

模板通过后提升 Motioner 版本并重新生成 DMG。`release/Motioner-integrity.json` 用于确认离线渲染组件没有漏包。

## 9. 后续外部模板方案

若未来确实需要“不重新打包即可安装模板”，应做 V2 的签名模板包，而不是直接 `import()` 任意脚本。建议格式包括 Manifest、预编译 bundle、静态资源、内容哈希、最低 Motioner API 版本和开发者签名；安装进隔离目录，禁用 Node/网络，只允许受限素材协议。模板包 SDK 版本、迁移和撤销安装都要先设计完成。

在这套沙箱、签名与兼容机制完成前，源码集成是 Motioner 个人版新增模板的正式途径。
