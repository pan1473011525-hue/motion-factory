import type {TransitionInkProps} from "../../templates/transition-ink/manifest";
import {AlphaSurface, EntranceExit, SafeArea, TextFit, ThemeProvider, useMotionTheme} from "../primitives";

export const TransitionInk: React.FC<TransitionInkProps> = (props) => <AlphaSurface><ThemeProvider preset={props.stylePreset} accent={props.accentColor}><SafeArea><EntranceExit style={{position: "absolute", inset: 0, display: "grid", placeItems: "center"}}><GeneratedTitle title={props.title} /></EntranceExit></SafeArea></ThemeProvider></AlphaSurface>;

const GeneratedTitle: React.FC<{title: string}> = ({title}) => {
  const theme = useMotionTheme();
  return <TextFit maxSize={92} minSize={42} maxCharacters={24} style={{color: theme.ink, fontWeight: 720, textAlign: "center"}}>{title}</TextFit>;
};
