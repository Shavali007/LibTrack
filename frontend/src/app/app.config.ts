import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    {
      provide: DATE_PIPE_DEFAULT_OPTIONS,
      useValue: { timezone: '+0530' }
    }
  ]
};
