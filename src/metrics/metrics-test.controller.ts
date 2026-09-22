// import { Controller, Get } from '@nestjs/common';

// @Controller('metrics-test')
// export class MetricsTestController {
//   @Get('slow')
//   async slowEndpoint() {
//     await new Promise((resolve) => setTimeout(resolve, 5000));

//     return {
//       message: 'Slow request completed',
//     };
//   }
// }

import { Controller, Get, HttpCode } from '@nestjs/common';

@Controller('metrics-test')
export class MetricsTestController {
  @Get('slow')
  async slowEndpoint() {
    await new Promise((resolve) => setTimeout(resolve, 200));

    return {
      message: 'Slow request completed',
    };
  }

  @Get('error')
  @HttpCode(500)
  errorEndpoint() {
    return {
      message: 'Simulated server error',
    };
  }
}
