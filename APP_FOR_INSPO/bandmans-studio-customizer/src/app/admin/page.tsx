"use client";

import { useState, type ChangeEvent, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Customizer from "@/components/customizer";
import type { Garment, GarmentLayer, ColorSettings, CustomizationState, ColorOption } from "@/lib/types";
import { PRESET_PALETTES } from "@/lib/palettes";
import { PlusCircle, Trash2, Upload, ArrowUp, ArrowDown, Settings, Loader, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getGarmentAction, saveGarmentAction } from "@/app/actions";
import { Skeleton } from "@/components/ui/skeleton";


const INITIAL_GARMENT: Garment = {
    id: "g-initial", // This ID signifies a new, unsaved garment
    name: "New Custom Garment",
    basePrice: 20,
    enabledOptions: {
      logo: false,
      text: false,
    },
    layers: [
      {
        id: "l-base",
        name: "Base Layer",
        imageDataUri: "https://placehold.co/800x800.png",
        zIndex: 10,
        price: 0,
        colorSettings: {},
        isOptional: false,
      },
    ],
  };

const INITIAL_CUSTOMIZATION: CustomizationState = {
  layerColors: {},
  optionalLayers: {},
  logo: { enabled: false, dataUri: null },
  text: {
    enabled: false,
    content: "",
    font: "Arial, sans-serif",
    color: "#000000",
  },
  view: "front",
}

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [garment, setGarment] = useState<Garment | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // This state is for the live preview on the right
  const [activeCustomization, setActiveCustomization] = useState<CustomizationState>(INITIAL_CUSTOMIZATION);

  const { toast } = useToast();

  useEffect(() => {
    const garmentId = searchParams.get("id");
    setIsLoading(true);
    if (garmentId) {
      getGarmentAction(garmentId).then(fetchedGarment => {
        if(fetchedGarment) {
          setGarment(fetchedGarment);
        } else {
          // Garment not found, redirect to create a new one
          toast({ variant: "destructive", title: "Product not found." });
          router.push('/admin');
        }
        setIsLoading(false);
      });
    } else {
      setGarment(INITIAL_GARMENT);
      setIsLoading(false);
    }
  }, [searchParams, router, toast]);

  const handleGarmentChange = (field: keyof Garment, value: any) => {
    if (!garment) return;
    setGarment({ ...garment, [field]: value });
  }

  const handleEnabledOptionChange = (option: 'logo' | 'text', value: boolean) => {
    if (!garment) return;
    const updatedOptions = { ...garment.enabledOptions, [option]: value };
    handleGarmentChange('enabledOptions', updatedOptions);
  }

  const updateGarmentLayers = (layers: GarmentLayer[]) => {
    if (!garment) return;
    const updatedLayersWithZIndex = layers.map((layer, index) => ({
      ...layer,
      zIndex: (index + 1) * 10,
    }));
    handleGarmentChange('layers', updatedLayersWithZIndex);
  };
  
  const handleLayerChange = (layerId: string, field: keyof GarmentLayer, value: any) => {
    if (!garment) return;
    const updatedLayers = garment.layers.map(l => {
        if (l.id === layerId) {
            return { ...l, [field]: value };
        }
        return l;
    });
    updateGarmentLayers(updatedLayers);
  };

  const handleColorSettingChange = (layerId: string, colorId: string, field: keyof ColorSettings, value: number) => {
    if (!garment) return;
     const updatedLayers = garment.layers.map(l => {
        if (l.id === layerId) {
            const newColorSettings = {
                ...(l.colorSettings || {}),
                [colorId]: {
                    ...(l.colorSettings?.[colorId] || { opacity: 1, brightness: 1, contrast: 1 }),
                    [field]: value
                }
            };
            return { ...l, colorSettings: newColorSettings };
        }
        return l;
    });
    setGarment({ ...garment, layers: updatedLayers });
  }


  const handleAddLayer = () => {
    if (!garment) return;
    const newLayer: GarmentLayer = {
      id: crypto.randomUUID(),
      name: "New Layer",
      imageDataUri: "https://placehold.co/800x800/e0e0e0/e0e0e0.png",
      zIndex: (garment.layers.length + 1) * 10,
      price: 0,
      colorSettings: {},
      isOptional: false,
    };
    updateGarmentLayers([...garment.layers, newLayer]);
  }

  const handleDeleteLayer = (layerId: string) => {
    if (!garment) return;
    const updatedLayers = garment.layers.filter((l) => l.id !== layerId);
    updateGarmentLayers(updatedLayers);
  }

  const handleLayerImageUpload = (layerId: string, e: ChangeEvent<HTMLInputElement>) => {
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

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      handleLayerChange(layerId, 'imageDataUri', reader.result as string)
      toast({ title: "Image updated!"})
    };
  }

  const handleMoveLayer = (index: number, direction: 'up' | 'down') => {
    if (!garment) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= garment.layers.length) return;

    const updatedLayers = [...garment.layers];
    const [movedLayer] = updatedLayers.splice(index, 1);
    updatedLayers.splice(newIndex, 0, movedLayer);
    updateGarmentLayers(updatedLayers);
  }
  
  const handleColorSelect = (layerId: string, color: ColorOption) => {
    setActiveCustomization(prev => ({
      ...prev,
      layerColors: { ...prev.layerColors, [layerId]: color }
    }));
  };

  const handleSave = async () => {
    if (!garment) return;
    setIsSaving(true);
    try {
      const savedGarment = await saveGarmentAction(garment);
      toast({
        title: "Product Saved!",
        description: `"${savedGarment.name}" has been saved successfully.`
      });
      // Update local state with the potentially new ID from the server
      setGarment(savedGarment);
      // Redirect to the home page after saving
      router.push('/admin/home');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error Saving Product",
        description: "There was a problem saving your product. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading || !garment) {
    return (
        <div className="container mx-auto grid min-h-[calc(100vh-4rem)] grid-cols-1 gap-8 p-4 lg:grid-cols-2 lg:p-8">
            <Card>
                <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-40 w-full" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                <CardContent><Skeleton className="aspect-square w-full" /></CardContent>
            </Card>
        </div>
    );
  }


  return (
    <div className="container mx-auto grid min-h-[calc(100vh-4rem)] grid-cols-1 gap-8 p-4 lg:grid-cols-2 lg:p-8">
      {/* LEFT COLUMN: BUILDER */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Admin Product Workshop</CardTitle>
            <CardDescription>
              Manage your customizable products, layers, and colors.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="garmentName">Garment Name</Label>
              <Input id="garmentName" value={garment.name} onChange={(e) => handleGarmentChange('name', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="basePrice">Base Price ($)</Label>
              <Input id="basePrice" type="number" value={garment.basePrice} onChange={(e) => handleGarmentChange('basePrice', Number(e.target.value))} />
            </div>

            <Separator />
            
            <div>
              <h3 className="mb-2 text-lg font-semibold">Enabled Customer Options</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                    <Switch id="enable-logo" checked={garment.enabledOptions.logo} onCheckedChange={(checked) => handleEnabledOptionChange('logo', checked)} />
                    <Label htmlFor="enable-logo">Allow Logo Upload</Label>
                </div>
                 <div className="flex items-center space-x-2">
                    <Switch id="enable-text" checked={garment.enabledOptions.text} onCheckedChange={(checked) => handleEnabledOptionChange('text', checked)} />
                    <Label htmlFor="enable-text">Allow Text Entry</Label>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Layers</h3>
                <Button variant="outline" size="sm" onClick={handleAddLayer}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Layer
                </Button>
              </div>
              <Accordion type="multiple" className="w-full space-y-2 mt-2">
                {garment.layers.map((layer, index) => {
                  const palette = PRESET_PALETTES.find(p => p.id === layer.paletteId);
                  return (
                    <AccordionItem key={layer.id} value={layer.id} className="rounded-md border bg-slate-50/50">
                       <div className="flex w-full items-center p-4 pr-2">
                         <AccordionTrigger className="flex-1 p-0 text-base font-semibold hover:no-underline">
                           {layer.name}
                        </AccordionTrigger>
                        <div className="flex items-center gap-1 pl-4">
                            <Button variant="ghost" size="icon" onClick={() => handleMoveLayer(index, 'up')} disabled={index === 0}><ArrowUp className="h-4 w-4"/></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleMoveLayer(index, 'down')} disabled={index === garment.layers.length-1}><ArrowDown className="h-4 w-4"/></Button>
                            <Button variant="destructive" size="icon" onClick={() => handleDeleteLayer(layer.id)}><Trash2 className="h-4 w-4"/></Button>
                        </div>
                      </div>
                      <AccordionContent className="space-y-4 px-4 pb-4 border-t pt-4">
                        <div className="space-y-2">
                            <Label>Layer Name</Label>
                            <Input value={layer.name} onChange={(e) => handleLayerChange(layer.id, 'name', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Layer Image (Greyscale)</Label>
                              <Input id={`layer-img-${layer.id}`} type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={(e) => handleLayerImageUpload(layer.id, e)}/>
                              <Button variant="outline" className="w-full" onClick={() => document.getElementById(`layer-img-${layer.id}`)?.click()}><Upload className="mr-2"/> Upload Image</Button>
                              {layer.imageDataUri && <Image src={layer.imageDataUri} alt="layer preview" width={100} height={100} className="mt-2 rounded-md border object-contain bg-slate-200" />}
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Layer Price ($)</Label>
                                    <Input type="number" value={layer.price} onChange={(e) => handleLayerChange(layer.id, 'price', Number(e.target.value))} />
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                  <Switch id={`optional-${layer.id}`} checked={layer.isOptional} onCheckedChange={(checked) => handleLayerChange(layer.id, 'isOptional', checked)} />
                                  <Label htmlFor={`optional-${layer.id}`}>Is Optional Layer</Label>
                                </div>
                                {layer.isOptional && <div className="space-y-2"><Label>Optional Label</Label><Input placeholder="e.g. Add Arm Gauntlets?" value={layer.optionalLabel || ''} onChange={e => handleLayerChange(layer.id, 'optionalLabel', e.target.value)} /></div> }
                                <div className="space-y-2 pt-2">
                                    <Label>Color Palette</Label>
                                    <Select value={layer.paletteId || 'none'} onValueChange={(value) => handleLayerChange(layer.id, 'paletteId', value === 'none' ? undefined : value)}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="No Palette (Not Recolorable)" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">No Palette (Not Recolorable)</SelectItem>
                                        {PRESET_PALETTES.map(p => (
                                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                          {palette && (
                            <div className="space-y-4 pt-4">
                                <h4 className="font-semibold">Per-Color Adjustments</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {palette.colors.map(color => {
                                    const settings = layer.colorSettings?.[color.id] || { opacity: 1, brightness: 1, contrast: 1 };
                                    return (
                                        <div key={color.id} className="flex items-center gap-2 rounded-md border p-2">
                                            <Button
                                              variant="outline"
                                              className={cn(
                                                "h-8 w-8 shrink-0 p-0 border-2",
                                                activeCustomization.layerColors[layer.id]?.id === color.id && "border-primary ring-2 ring-primary"
                                              )}
                                              style={{backgroundColor: color.value}}
                                              onClick={() => handleColorSelect(layer.id, color)}
                                            />
                                            <span className="flex-1 text-xs font-medium truncate">{color.name}</span>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="icon"><Settings className="h-4 w-4"/></Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-64 space-y-4">
                                                    <h5 className="font-medium text-sm">{color.name} Adjustments</h5>
                                                    <div className="space-y-2">
                                                        <Label>Opacity: {settings.opacity.toFixed(2)}</Label>
                                                        <Slider value={[settings.opacity]} onValueChange={([v]) => handleColorSettingChange(layer.id, color.id, 'opacity', v)} max={1} step={0.01} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Brightness: {settings.brightness.toFixed(2)}</Label>
                                                        <Slider value={[settings.brightness]} onValueChange={([v]) => handleColorSettingChange(layer.id, color.id, 'brightness', v)} min={0} max={2} step={0.01} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Contrast: {settings.contrast.toFixed(2)}</Label>
                                                        <Slider value={[settings.contrast]} onValueChange={([v]) => handleColorSettingChange(layer.id, color.id, 'contrast', v)} min={0} max={2} step={0.01} />
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    )
                                })}
                                </div>
                            </div>
                          )}
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </div>
            
            <Separator />
            
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader className="animate-spin" /> : <Save />}
                Save Product
              </Button>
            </div>

          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN: PREVIEW */}
      <div className="lg:col-span-1">
        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle>Live Interactive Preview</CardTitle>
            <CardDescription>This is how the customizer will appear to customers. Interact with it to test your configuration.</CardDescription>
          </CardHeader>
          <CardContent>
             <Customizer 
                garment={garment} 
                isAdminPreview={true}
                customization={activeCustomization}
                onCustomizationChange={setActiveCustomization}
              />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
