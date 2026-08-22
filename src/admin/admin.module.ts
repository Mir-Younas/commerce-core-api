import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ProductsModule } from 'src/products/products.module';
import { OrdersModule } from 'src/orders/orders.module';

@Module({
  imports:[ProductsModule, OrdersModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
