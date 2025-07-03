import type { ColorPalette, ColorOption } from "@/lib/types";

const generateColors = (
  names: string[],
  hexValues: string[],
  prices: (number | null)[] = []
): ColorOption[] => {
  return names.map((name, index) => ({
    id: `${name.toLowerCase().replace(/ /g, "-")}-${index}`,
    name,
    value: hexValues[index],
    price: prices[index] || 0,
  }));
};

export const PRESET_PALETTES: ColorPalette[] = [
  {
    id: "lycra",
    name: "Lycra",
    colors: generateColors(
      [
        "White", "Black", "Gold", "Kelly", "Hunter", "Bt Orange", "Fuchsia",
        "Purple", "Royal", "Lt Navy", "Red", "Burgundy", "Silver",
        "Titanium", "Lt Gold", "Copen", "Beet Red",
      ],
      [
        "#FFFFFF", "#1a1a1a", "#FFD700", "#4CBB17", "#355E3B", "#FF7F50",
        "#FF00FF", "#800080", "#4169E1", "#000080", "#FF0000", "#800000",
        "#C0C0C0", "#878681", "#E6C75F", "#3876A2", "#A83C43",
      ]
    ),
  },
  {
    id: "microsequin",
    name: "Microsequin",
    colors: generateColors(
      [
        "Eggplant", "Burgundy", "Fuchsia", "Gold", "Orange", "Red", "Lime",
        "Purple", "Kelly", "Turquoise", "Navy", "Royal", "Columbia Blue",
        "White", "Steel", "Black", "Silver",
      ],
      [
        "#614051", "#800000", "#FF00FF", "#FFD700", "#FFA500", "#FF0000",
        "#00FF00", "#800080", "#4CBB17", "#40E0D0", "#000080", "#4169E1",
        "#C9D9EF", "#FFFFFF", "#4682B4", "#1a1a1a", "#C0C0C0",
      ]
    ),
  },
  {
    id: "velvet",
    name: "Velvet",
    colors: generateColors(
      [
        "Black", "White", "Beige", "Chocolate", "Red", "Burgundy", "Kelly",
        "Hunter", "Navy", "Royal", "B Blue", "Turquoise", "B Pink", "Lt Gold",
        "Lime", "N Pink", "N Orange", "Lt Purple",
      ],
      [
        "#1a1a1a", "#FFFFFF", "#F5F5DC", "#D2691E", "#FF0000", "#800000",
        "#4CBB17", "#355E3B", "#000080", "#4169E1", "#A1CAF1", "#40E0D0",
        "#FFC1CC", "#E6C75F", "#00FF00", "#FF69B4", "#FF8C69", "#E6E6FA",
      ]
    ),
  },
  {
    id: "sequin-trim",
    name: "Sequin Trim",
    colors: generateColors(
      [
        "Royal", "Navy", "Forest Green", "Fuchsia", "Burgundy", "Purple",
        "Red", "Orange", "Gold", "Silver", "Lime Green", "White",
        "Holo Gold", "Holo Silver",
      ],
      [
        "#4169E1", "#000080", "#228B22", "#FF00FF", "#800000", "#800080",
        "#FF0000", "#FFA500", "#FFD700", "#C0C0C0", "#32CD32", "#FFFFFF",
        "#DAA520", "#B0C4DE",
      ],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5]
    ),
  },
  {
    id: "polyester",
    name: "100% Polyester",
    colors: generateColors(
      [
        "Black", "White", "Purple", "Red", "Royal", "Kelly", "Orange",
        "Med Blue", "Copen", "Cranberry", "Brown", "Dark Green", "Maroon",
        "Navy", "Gray", "Light Gold", "Light Blue",
      ],
      [
        "#1a1a1a", "#FFFFFF", "#800080", "#FF0000", "#4169E1", "#4CBB17",
        "#FFA500", "#0000CD", "#3876A2", "#950714", "#A52A2A", "#006400",
        "#800000", "#000080", "#808080", "#F0E68C", "#ADD8E6",
      ]
    ),
  },
  {
    id: "buttons",
    name: "Buttons",
    colors: generateColors(
      ["Gold", "Silver", "Black"],
      ["#FFD700", "#C0C0C0", "#1a1a1a"]
    ),
  },
];
