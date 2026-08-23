import { ProductStatus } from '@prisma/client';

export type ProductUpdateSnapshot = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  discountPrice: number | null;
  stock: number;
  sku: string;
  brand: string | null;
  status: ProductStatus;
  isFeatured: boolean;
  categoryId: string;
};
