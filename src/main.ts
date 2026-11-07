import { inject, provideAppInitializer } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withNavigationErrorHandler } from '@angular/router';
import { sendSignInToAccount } from './app/account/sign-in-landing';
import { startAnalytics } from './app/analytics';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { AddressMove } from './app/nav/moved-banner/address-move.service';
import { reloadOnStaleCode } from './app/nav/stale-code';
import { AlarmService } from './app/shared/alarms/alarm.service';
import { ActiveRunService } from './app/shared/run/active-run.service';
import { DeviceDataService } from './app/shared/state/device-data.service';
import { ThemeService } from './app/shared/theme/theme.service';
import { SyncStarter } from './app/sync/sync-starter.service';

bootstrapApplication(AppComponent, {
    providers: [
        // A tab on an older build loads the page afresh when the page's code has gone
        provideRouter(routes, withNavigationErrorHandler(reloadOnStaleCode)),
        provideAppInitializer(() => {
            // A sign-in coming back to the wrong page goes on to the Account tab, which reads it
            sendSignInToAccount(location, history);
            // Start listening for the first tap straight away, so sound is unlocked by the
            // time a workout starts (browsers only allow sound after an interaction)
            inject(AlarmService);
            // Apply the theme setting, and keep following it
            inject(ThemeService);
            // Pick up a workout already going (after a refresh), whichever page this is
            inject(ActiveRunService);
            // Start again empty if another tab clears this device
            inject(DeviceDataService);
            // Sync, if this device is signed in (loading its code only then)
            inject(SyncStarter).startIfSignedIn();
            // On the old address, move to loopworkouts.com once nothing here would be lost
            inject(AddressMove).start();
        }),
    ],
}).catch((err) => console.error(err));

// Count page views and measure how fast pages are (anonymously, with no cookies), once the
// app is on its way
startAnalytics(routes.flatMap((route) => route.path ?? []));
