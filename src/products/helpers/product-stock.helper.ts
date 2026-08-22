import { BadRequestException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';

export type StockOperation = 'increment' | 'decrement';

export type StockUpdateItem = {
  productId: string;
  quantity: number;
  productName?: string;
};

export async function updateProductStock(
  tx: Prisma.TransactionClient,
  items: StockUpdateItem[],
  operation: StockOperation,
): Promise<void> {
  for (const item of items) {
    if (operation === 'decrement') {
      const stockUpdateResult = await tx.product.updateMany({
        where: {
          id: item.productId,
          status: ProductStatus.ACTIVE,
          stock: {
            gte: item.quantity,
          },
        },

        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });

      if (stockUpdateResult.count !== 1) {
        throw new BadRequestException(
          `Stock changed for ${
            item.productName ?? 'product'
          }. Please review your cart`,
        );
      }

      continue;
    }

    await tx.product.update({
      where: {
        id: item.productId,
      },

      data: {
        stock: {
          increment: item.quantity,
        },
      },
    });
  }
}
