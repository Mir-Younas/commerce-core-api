import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { S3Module } from './common/s3/s3.module';
import { ProductsModule } from './products/products.module';
import { AdminModule } from './admin/admin.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { UsersModule } from './users/users.module';
import { PaymentsModule } from './payments/payments.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { AddressesModule } from './addresses/addresses.module';
import { ReviewsModule } from './reviews/reviews.module';
import { CouponsModule } from './coupons/coupons.module';
import { ReturnsModule } from './returns/returns.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SmsModule } from './sms/sms.module';
import { PushModule } from './push/push.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    CategoriesModule,
    S3Module,
    ProductsModule,
    AdminModule,
    CartModule,
    OrdersModule,
    UsersModule,
    PaymentsModule,
    WishlistModule,
    AddressesModule,
    ReviewsModule,
    CouponsModule,
    ReturnsModule,
    NotificationsModule,
    SmsModule,
    PushModule,
    MetricsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
