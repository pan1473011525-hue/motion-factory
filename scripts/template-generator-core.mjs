export const validateTemplateId = (id) => {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(id)) {
    throw new Error("模板 ID 必须使用小写短横线，例如 audience-growth");
  }
  return id;
};

export const toPascalCase = (id) => id.split("-").map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join("");

export const replaceRequiredMarker = (source, marker, insertion) => {
  if (!source.includes(marker)) {
    throw new Error(`模板注册标记不存在：${marker}`);
  }
  return source.replace(marker, insertion);
};

export const createTemplateFiles = ({id, name, category = "information"}) => {
  validateTemplateId(id);
  const componentName = toPascalCase(id);
  const manifestName = `${componentName[0]?.toLowerCase() ?? "t"}${componentName.slice(1)}Manifest`;
  const manifest = `import {zColor} from "@remotion/zod-types";\nimport {z} from "zod";\nimport {defineTemplateManifest} from "../../../packages/template-sdk/src";\n\nexport const ${id.replaceAll("-", "_")}Schema = z.object({\n  title: z.string().trim().min(1).max(48),\n  accentColor: zColor(),\n  stylePreset: z.enum(["editorial", "minimal", "vibrant"]),\n});\n\nexport type ${componentName}Props = z.infer<typeof ${id.replaceAll("-", "_")}Schema>;\n\nexport const ${manifestName} = defineTemplateManifest<${componentName}Props>({\n  id: "${id}", compositionId: "${componentName}", version: "1.0.0", name: ${JSON.stringify(name)}, category: "${category}",\n  tags: [${JSON.stringify(name)}], description: "请补充模板用途。", schema: ${id.replaceAll("-", "_")}Schema,\n  defaultProps: {title: ${JSON.stringify(name)}, accentColor: "#47A7FF", stylePreset: "editorial"},\n  fields: [\n    {key: "title", label: "标题", section: "content", control: "text", maxLength: 48},\n    {key: "stylePreset", label: "样式", section: "style", control: "select", options: [{label: "编辑部", value: "editorial"}, {label: "极简", value: "minimal"}, {label: "鲜明", value: "vibrant"}]},\n    {key: "accentColor", label: "强调色", section: "style", control: "color"},\n  ],\n  durationMode: "fixed-edges", capabilities: {alpha: true, audio: false, mediaSlots: 0, minDurationFrames: 75, maxDurationFrames: 18_000, supportedAspectRatios: ["16:9", "9:16", "1:1", "custom"]},\n  stylePresets: [{id: "editorial", name: "编辑部", patch: {stylePreset: "editorial"}}, {id: "minimal", name: "极简", patch: {stylePreset: "minimal"}}, {id: "vibrant", name: "鲜明", patch: {stylePreset: "vibrant"}}], migrations: [], preview: {accent: "#47A7FF", label: ${JSON.stringify(name)}},\n});\n`;
  const component = `import type {${componentName}Props} from "../../templates/${id}/manifest";\nimport {AlphaSurface, EntranceExit, SafeArea, TextFit, ThemeProvider, useMotionTheme} from "../primitives";\n\nexport const ${componentName}: React.FC<${componentName}Props> = (props) => <AlphaSurface><ThemeProvider preset={props.stylePreset} accent={props.accentColor}><SafeArea><EntranceExit style={{position: "absolute", inset: 0, display: "grid", placeItems: "center"}}><GeneratedTitle title={props.title} /></EntranceExit></SafeArea></ThemeProvider></AlphaSurface>;\n\nconst GeneratedTitle: React.FC<{title: string}> = ({title}) => {\n  const theme = useMotionTheme();\n  return <TextFit maxSize={92} minSize={42} maxCharacters={24} style={{color: theme.ink, fontWeight: 720, textAlign: "center"}}>{title}</TextFit>;\n};\n`;
  return {componentName, manifestName, manifest, component};
};

export const registryInsertions = ({id, componentName, manifestName}) => ({
  catalogImports: `import {${manifestName}} from "./${id}/manifest";\n// motioner-scaffold:manifest-imports`,
  catalogItem: `  eraseManifestType(${manifestName}),\n  // motioner-scaffold:catalog-items`,
  runtimeComponentImport: `import {${componentName}} from "../remotion/generated/${id}";\n// motioner-scaffold:component-imports`,
  runtimeManifestImport: `import {${manifestName}} from "./${id}/manifest";\n// motioner-scaffold:manifest-imports`,
  runtimeItem: `  eraseDefinitionType(defineTemplate({...${manifestName}, component: ${componentName}})),\n  // motioner-scaffold:runtime-items`,
});
