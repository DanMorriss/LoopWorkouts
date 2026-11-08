import { formatDate } from '@angular/common';
import { Component } from '@angular/core';
import { LegalPageComponent } from './legal-page.component';
import { PRIVACY_NOTICE_DATE } from './notice-date';

/**
 * /privacy, linked from You. Kept true to what the app does: change it in the same PR as
 * anything that stores more, or sends anything off the device (e.g. sync, in Phase 4).
 */
@Component({
    selector: 'app-privacy',
    imports: [LegalPageComponent],
    templateUrl: './privacy.component.html',
    styleUrl: './legal-text.scss',
})
export class PrivacyComponent {
    protected readonly updated = formatDate(PRIVACY_NOTICE_DATE, 'd MMMM y', 'en-US');
}
