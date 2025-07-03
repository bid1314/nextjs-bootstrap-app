
"use client";

import { useState, useMemo, useRef, type ChangeEvent } from "react";
import Image from "next/image";
import {
  Palette,
  UploadCloud,
  Type,
  Trash2,
  Save,
  Share2,
  ShoppingCart,
  Loader,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { checkLogoAction } from "@/app/actions";
import type { Garment, ColorOption, GarmentLayer, ColorSettings, CustomizationState } from "@/lib/types";
import { PRESET_PALETTES } from "@/lib/palettes";

const MOCK_GARMENT: Garment = {
  id: "g-initial",
  name: "New Custom Garment",
  basePrice: 20,
  enabledOptions: {
    logo: true,
    text: true,
  },
  layers: [
    {
      id: "l1",
      name: "Base Fabric",
      imageDataUri: "https://placehold.co/800x800/eeeeee/eeeeee.png",
      zIndex: 10,
      price: 0,
      paletteId: "lycra",
      isOptional: false,
    },
    {
      id: "l3",
      name: "Arm Gauntlets",
      imageDataUri: "https://placehold.co/800x800/bbbbbb/bbbbbb.png",
      zIndex: 15,
      price: 30,
      paletteId: "velvet",
      isOptional: true,
      optionalLabel: "Add Arm Gauntlets?",
    },
    {
      id: "l2",
      name: "Shadows",
      imageDataUri: "https://placehold.co/800x800/000000/000000.png",
      zIndex: 20,
      price: 0,
      isOptional: false,
      colorSettings: { 'shadow': { opacity: 0.15, brightness: 1, contrast: 1 } }
    },
  ],
};

const FONTS = [
  { name: "Arial", value: "Arial, sans-serif" },
  { name: "Times New Roman", value: "'Times New Roman', serif" },
  { name: "Courier New", value: "'Courier New', monospace" },
  { name: "Brush Script MT", value: "'Brush Script MT', cursive" },
];

const LOGO_PRICE = 10;
const TEXT_PRICE = 7;

const INITIAL_CUSTOMIZATION: CustomizationState = {
  layerColors: {},
  optionalLayers: {},
  logo: { enabled: false, dataUri: null },
  text: {
    enabled: false,
    content: "",
    font: FONTS[0].value,
    color: "#000000",
  },
  view: "front",
};

type CustomizerProps = {
  garment?: Garment;
  isAdminPreview?: boolean;
  customization?: CustomizationState;
  onCustomizationChange?: (newState: CustomizationState | ((prevState: CustomizationState) => CustomizationState)) => void;
}

const LayerRenderer = ({ 
    layer, 
    color, 
    view 
}: { 
    layer: GarmentLayer, 
    color?: ColorOption, 
    view: 'front' | 'back' 
}) => {
    if (view === 'back') return null;

    // A layer is recolorable if it has a palette AND a color is selected for it.
    const isRecolorable = !!layer.paletteId && !!color;
    
    // For non-recolorable layers (like shadows), we might have a default setting.
    const isFixedColorLayer = !layer.paletteId && !!layer.colorSettings;

    let settings: ColorSettings | null = null;
    let tintColor = 'transparent';

    if (isRecolorable && color) {
        settings = layer.colorSettings?.[color.id] || { opacity: 1, brightness: 1, contrast: 1 };
        tintColor = color.value;
    } else if (isFixedColorLayer) {
        // Find the first (and likely only) color setting for fixed layers.
        const settingKey = Object.keys(layer.colorSettings!)[0];
        settings = layer.colorSettings![settingKey];
        // For shadow layers, the "tint color" is black.
        tintColor = '#000000';
    }


    return (
        <div style={{ zIndex: layer.zIndex }} className="pointer-events-none absolute inset-0">
            {/* Greyscale Base Image */}
            <Image
                src={layer.imageDataUri}
                alt={layer.name}
                width={800}
                height={800}
                className="absolute inset-0 h-full w-full object-contain"
                // The base image is always fully opaque. The tint layer handles opacity.
                style={{ opacity: 1 }}
                data-ai-hint={layer.id === 'l1' ? "t-shirt mockup" : "fabric shadow"}
            />
            
            {/* Color Tint Overlay */}
            {settings && (
                <div
                    className="absolute inset-0 h-full w-full"
                    style={{
                        backgroundColor: tintColor,
                        mixBlendMode: 'multiply',
                        maskImage: `url(${layer.imageDataUri})`,
                        WebkitMaskImage: `url(${layer.imageDataUri})`,
                        maskSize: 'contain',
                        maskRepeat: 'no-repeat',
                        maskPosition: 'center',
                        filter: `brightness(${settings.brightness}) contrast(${settings.contrast})`,
                        opacity: settings.opacity,
                    }}
                />
            )}
        </div>
    );
};


export default function Customizer({ 
  garment: garmentProp, 
  isAdminPreview = false,
  customization: controlledCustomization,
  onCustomizationChange
}: CustomizerProps) {
  const garment = garmentProp || MOCK_GARMENT;
  
  const [internalCustomization, setInternalCustomization] = useState<CustomizationState>(INITIAL_CUSTOMIZATION);

  const isControlled = isAdminPreview && !!controlledCustomization && !!onCustomizationChange;
  const customization = isControlled ? controlledCustomization : internalCustomization;
  const setCustomization = isControlled ? onCustomizationChange : setInternalCustomization;

  const [isLoadingLogo, setIsLoadingLogo] = useState(false);
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const totalPrice = useMemo(() => {
    let price = garment.basePrice;
    
    // Optional Layer Price
    for (const layerId in customization.optionalLayers) {
      if(customization.optionalLayers[layerId]) {
          const layer = garment.layers.find(l => l.id === layerId);
          if(layer) price += layer.price;
      }
    }

    // Color Price
    for (const layerId in customization.layerColors) {
      const layer = garment.layers.find(l => l.id === layerId);
      if (layer && (!layer.isOptional || customization.optionalLayers[layer.id])) {
        price += customization.layerColors[layerId]?.price || 0;
      }
    }

    if (customization.logo.enabled) price += LOGO_PRICE;
    if (customization.text.enabled) price += TEXT_PRICE;

    return price;
  }, [customization, garment]);

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload an image smaller than 4MB.",
      });
      return;
    }

    setIsLoadingLogo(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const dataUri = reader.result as string;
      const result = await checkLogoAction(dataUri);
      setIsLoadingLogo(false);

      if (result.isSafe) {
        setCustomization((prev) => ({ ...prev, logo: {...prev.logo, dataUri: dataUri }}));
        toast({
          title: "Logo uploaded successfully!",
          description: "Your logo passed our content safety check.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Logo Content Warning",
          description: `Your logo was flagged for the following reason: ${result.reason}`,
        });
      }
    };
    reader.onerror = () => {
      setIsLoadingLogo(false);
      toast({
        variant: "destructive",
        title: "Error reading file",
        description: "Could not read the selected file.",
      });
    };
  };
  
  const recolorableLayers = useMemo(() => {
    return garment.layers.filter(l => l.paletteId).map(layer => {
        const palette = PRESET_PALETTES.find(p => p.id === layer.paletteId);
        return { ...layer, palette };
    })
  }, [garment.layers]);

  const nonRecolorableLayers = useMemo(() => garment.layers.filter(l => !l.paletteId), [garment.layers]);

  const mainContent = (
    <div>
        <div className="relative mx-auto aspect-square max-w-[800px]">
            {[...nonRecolorableLayers, ...recolorableLayers].sort((a, b) => a.zIndex - b.zIndex).map(layer => {
                if (layer.isOptional && !customization.optionalLayers[layer.id]) {
                return null;
                }
                return <LayerRenderer key={layer.id} layer={layer} color={customization.layerColors[layer.id]} view={customization.view}/>
            })}
            
            {customization.logo.enabled && customization.logo.dataUri && customization.view === "front" && (
            <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2" style={{ zIndex: 100 }}>
                <Image
                src={customization.logo.dataUri}
                alt="Custom logo"
                width={150}
                height={150}
                className="h-auto w-[150px] object-contain"
                />
            </div>
            )}
            {customization.text.enabled && customization.text.content && customization.view === "front" && (
            <div
                className="pointer-events-none absolute left-1/2 top-2/3 -translate-x-1/2 -translate-y-1/2 select-none whitespace-pre-wrap text-center text-4xl font-bold"
                style={{
                fontFamily: customization.text.font,
                color: customization.text.color,
                zIndex: 101
                }}
            >
                {customization.text.content}
            </div>
            )}
        </div>
        
        <div className="mt-8">
            <h2 className="text-2xl font-bold">{garment.name}</h2>
            <div className="mt-6 space-y-6">

            {recolorableLayers.filter(l => !l.isOptional).map(layer => {
                if (!layer.palette) return null;
                return (
                    <Accordion key={layer.id} type="single" collapsible defaultValue="item-1" className="w-full rounded-md border">
                        <AccordionItem value="item-1" className="border-none">
                            <AccordionTrigger className="px-4 text-base font-semibold">
                                <Palette className="mr-2 h-5 w-5" />
                                {layer.name} Color
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pt-2">
                                <div className="flex flex-wrap gap-2">
                                    {layer.palette.colors.map(color => (
                                         <div key={color.id} className="flex flex-col items-center">
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "h-10 w-10 p-0 border-2",
                                                    customization.layerColors[layer.id]?.id === color.id &&
                                                    "border-primary ring-2 ring-primary"
                                                )}
                                                onClick={() => setCustomization(prev => ({
                                                    ...prev,
                                                    layerColors: { ...prev.layerColors, [layer.id]: color }
                                                }))}
                                            >
                                                <div className="h-full w-full rounded-sm" style={{ backgroundColor: color.value }}/>
                                            </Button>
                                            <span className="mt-1 text-xs text-center">{color.name}</span>
                                            {color.price > 0 && (
                                                <span className="text-xs text-muted-foreground">
                                                    +${color.price.toFixed(2)}
                                                </span>
                                            )}
                                         </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )
            })}
            
            {recolorableLayers.filter(l => l.isOptional).map(layer => {
                if (!layer.palette) return null;
                const isEnabled = !!customization.optionalLayers[layer.id];
                return (
                    <div key={layer.id} className="space-y-3 rounded-md border p-4">
                        <div className="flex items-center space-x-3">
                            <Checkbox 
                                id={`check-optional-${layer.id}`} 
                                checked={isEnabled}
                                onCheckedChange={(checked) => {
                                    setCustomization(prev => ({
                                        ...prev,
                                        optionalLayers: {...prev.optionalLayers, [layer.id]: !!checked}
                                    }));
                                }}
                            />
                            <Label htmlFor={`check-optional-${layer.id}`} className="text-base font-semibold cursor-pointer">
                                {layer.optionalLabel || `Enable ${layer.name}`}
                                {layer.price > 0 && ` (+$${layer.price.toFixed(2)})`}
                            </Label>
                        </div>

                        {isEnabled && (
                            <Accordion type="single" collapsible defaultValue="item-1" className="w-full border-t mt-4 pt-4">
                                <AccordionItem value="item-1" className="border-none">
                                    <AccordionTrigger className="px-0 py-0 text-base font-semibold">
                                        <Palette className="mr-2 h-5 w-5" />
                                        {layer.name} Color
                                    </AccordionTrigger>
                                    <AccordionContent className="px-0 pb-0 pt-4">
                                       <div className="flex flex-wrap gap-2">
                                            {layer.palette.colors.map(color => (
                                                 <div key={color.id} className="flex flex-col items-center">
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "h-10 w-10 p-0 border-2",
                                                            customization.layerColors[layer.id]?.id === color.id &&
                                                            "border-primary ring-2 ring-primary"
                                                        )}
                                                        onClick={() => setCustomization(prev => ({
                                                            ...prev,
                                                            layerColors: { ...prev.layerColors, [layer.id]: color }
                                                        }))}
                                                    >
                                                        <div className="h-full w-full rounded-sm" style={{ backgroundColor: color.value }}/>
                                                    </Button>
                                                    <span className="mt-1 text-xs text-center">{color.name}</span>
                                                    {color.price > 0 && (
                                                        <span className="text-xs text-muted-foreground">
                                                            +${color.price.toFixed(2)}
                                                        </span>
                                                    )}
                                                 </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        )}
                    </div>
                );
            })}

            {garment.enabledOptions.logo && (
                <div className="space-y-3 rounded-md border p-4">
                    <div className="flex items-center space-x-3">
                        <Checkbox id="check-logo" checked={customization.logo.enabled} onCheckedChange={(checked) => setCustomization(prev => ({ ...prev, logo: { ...prev.logo, enabled: !!checked}}))} />
                        <Label htmlFor="check-logo" className="text-base font-semibold cursor-pointer">Add Logo{LOGO_PRICE > 0 && ` (+$${LOGO_PRICE.toFixed(2)})`}</Label>
                    </div>
                    {customization.logo.enabled && (
                        <div className="space-y-4 pt-4 border-t mt-4">
                           <Input ref={logoInputRef} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleLogoUpload} />
                           <Button variant="outline" className="w-full" onClick={() => logoInputRef.current?.click()} disabled={isLoadingLogo}>
                              {isLoadingLogo ? <Loader className="animate-spin" /> : <UploadCloud />}
                              Upload Logo
                           </Button>
                           {customization.logo.dataUri && (
                             <div className="group relative mx-auto w-fit">
                               <Image src={customization.logo.dataUri} alt="Uploaded logo" width={100} height={100} className="rounded-md border" />
                               <Button variant="destructive" size="icon" className="absolute -right-2 -top-2 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100" onClick={() => setCustomization(prev => ({ ...prev, logo: { ...prev.logo, dataUri: null } }))} >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                             </div>
                           )}
                        </div>
                    )}
                </div>
            )}
            
            {garment.enabledOptions.text && (
                 <div className="space-y-3 rounded-md border p-4">
                    <div className="flex items-center space-x-3">
                        <Checkbox id="check-text" checked={customization.text.enabled} onCheckedChange={(checked) => setCustomization(prev => ({ ...prev, text: { ...prev.text, enabled: !!checked}}))} />
                        <Label htmlFor="check-text" className="text-base font-semibold cursor-pointer">Add Text{TEXT_PRICE > 0 && ` (+${TEXT_PRICE.toFixed(2)})`}</Label>
                    </div>
                    {customization.text.enabled && (
                         <div className="space-y-4 pt-4 border-t mt-4">
                            <Textarea
                            placeholder="Your Text Here"
                            value={customization.text.content}
                            onChange={(e) => setCustomization((prev) => ({ ...prev, text: { ...prev.text, content: e.target.value }}))}
                            />
                            <Select value={customization.text.font} onValueChange={(value) => setCustomization((prev) => ({...prev, text: { ...prev.text, font: value }}))}>
                            <SelectTrigger><SelectValue placeholder="Select a font" /></SelectTrigger>
                            <SelectContent>
                                {FONTS.map((font) => (
                                <SelectItem key={font.name} value={font.value} style={{fontFamily: font.value}}>
                                    {font.name}
                                </SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <div className="flex flex-wrap gap-2">
                            {PRESET_PALETTES.find(p=>p.id==='lycra')?.colors.map((color) => (
                                <Button key={color.id} variant="outline" size="icon" className={cn("h-8 w-8", customization.text.color === color.value && "ring-2 ring-primary")} style={{ backgroundColor: color.value }} onClick={() => setCustomization(prev => ({ ...prev, text: { ...prev.text, color: color.value } }))}>
                                <span className="sr-only">{color.name}</span>
                                </Button>
                            ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
             {!isAdminPreview && (
              <div className="mt-8">
                <Card className="p-6">
                    <div className="flex items-center justify-between text-2xl font-bold">
                    <span>Total:</span>
                    <span>${totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                    <Button size="lg" variant="outline"><Save /> Save Design</Button>
                    <Button size="lg" variant="outline"><Share2 /> Share</Button>
                    </div>
                    <Button size="lg" className="w-full mt-2"><ShoppingCart /> Add to Cart</Button>
                </Card>
              </div>
             )}
            </div>
        </div>
      </div>
  );

  if (isAdminPreview) {
    return (
      <div className="overflow-hidden rounded-lg border bg-background p-4">
        {mainContent}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
        <Card>
            <CardContent className="p-4 sm:p-8">
              {mainContent}
            </CardContent>
        </Card>
    </div>
  );
}
