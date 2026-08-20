import { NextResponse } from "next/server";
import { woocommerceService } from "@/services/woocommerce";
import { ProductAttribute } from "@/types";

export const dynamic = "force-dynamic";

export interface AttributePreset {
  name: string;
  options: string[];
  productCount: number;
}

export async function GET() {
  try {
    // Fetch products to gather all existing store attributes
    const { items: products } = await woocommerceService.getProducts({ perPage: 50 });

    const attrMap: Record<string, { options: Set<string>; count: number }> = {
      // Store ERP Store Standard Presets
      "SIZE (Standard Kits)": {
        options: new Set(["SINGLE", "1/2 KITS (5 VIALS)", "FULL KITS (10 VIALS)"]),
        count: 30,
      },
      "SIZE (Kits)": {
        options: new Set(["SINGLE", "1/2 KITS", "FULL KITS"]),
        count: 10,
      },
      "DOSAGE / MG": {
        options: new Set(["5MG", "10MG", "15MG", "20MG", "30MG", "50MG", "60MG", "100MG", "500MG"]),
        count: 8,
      },
      "VIALS / PACK": {
        options: new Set(["1 Vial", "5 Vials", "10 Vials"]),
        count: 5,
      },
    };

    // Aggregate real live store attributes from actual products
    for (const p of products) {
      if (p.attributes && Array.isArray(p.attributes)) {
        for (const attr of p.attributes as ProductAttribute[]) {
          const key = attr.name?.trim();
          if (!key) continue;
          if (!attrMap[key]) {
            attrMap[key] = { options: new Set(), count: 0 };
          }
          attrMap[key].count += 1;
          (attr.options || []).forEach((opt: string) => attrMap[key].options.add(opt.trim()));
        }
      }
    }

    const presets: AttributePreset[] = Object.entries(attrMap).map(([name, data]) => ({
      name,
      options: Array.from(data.options),
      productCount: data.count,
    }));

    return NextResponse.json({
      success: true,
      data: presets,
    });
  } catch (error) {
    console.error("Error fetching attribute presets:", error);
    // Return standard fallback presets
    return NextResponse.json({
      success: true,
      data: [
        {
          name: "SIZE",
          options: ["SINGLE", "1/2 KITS (5 VIALS)", "FULL KITS (10 VIALS)"],
          productCount: 30,
        },
        {
          name: "DOSAGE",
          options: ["5MG", "10MG", "20MG", "50MG"],
          productCount: 10,
        },
      ],
    });
  }
}
