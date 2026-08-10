export type GeneratedTemplateFiles = {
  componentName: string;
  manifestName: string;
  manifest: string;
  component: string;
};

export const validateTemplateId: (id: string) => string;
export const toPascalCase: (id: string) => string;
export const createTemplateFiles: (input: {id: string; name: string; category?: string}) => GeneratedTemplateFiles;
export const registryInsertions: (input: {id: string; componentName: string; manifestName: string}) => {
  catalogImports: string;
  catalogItem: string;
  runtimeComponentImport: string;
  runtimeManifestImport: string;
  runtimeItem: string;
};
