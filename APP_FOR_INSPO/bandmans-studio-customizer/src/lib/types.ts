export type ColorOption = {
  id: string;
  name: string;
  value: string; // hex code
  price: number;
};

export type ColorSettings = {
  opacity: number;
  brightness: number;
  contrast: number;
};

export type GarmentLayer = {
  id: string;
  name: string;
  imageDataUri: string;
  zIndex: number;
  price: number;
  // Individual color settings are now stored here. The key is the ColorOption.id
  colorSettings?: Record<string, ColorSettings>;
  paletteId?: string; // If present, the layer is recolorable using this palette
  isOptional: boolean;
  optionalLabel?: string;
};

export type Garment = {
  id: string;
  name: string;
  basePrice: number;
  layers: GarmentLayer[];
  enabledOptions: {
    logo: boolean;
    text: boolean;
  };
};

export type ColorPalette = {
  id: string;
  name: string;
  colors: ColorOption[];
};

export type CustomizationState = {
  layerColors: Record<string, ColorOption>;
  optionalLayers: Record<string, boolean>;
  logo: {
    enabled: boolean;
    dataUri: string | null;
  };
  text: {
    enabled: boolean;
    content: string;
    font: string;
    color: string;
  };
  view: "front" | "back";
};
