import { Component, inject, input } from '@angular/core';
import { PageSlide } from '../../shared/navigation/page-slide';
import { IconComponent } from '../../shared/components/icon/icon.component';

/**
 * ‹ and where it goes back to, at the top of a page that slides in over another (an exercise
 * over the list, Settings or the legal pages over Account). It slides the page back off.
 */
@Component({
    selector: 'app-back-link',
    imports: [IconComponent],
    template: `
        <a [href]="url()" class="back-link" (click)="slide.follow($event, url(), 'out')">
            <app-icon>chevron_left</app-icon>
            {{ label() }}
        </a>
    `,
    styleUrl: './back-link.component.scss',
})
export class BackLinkComponent {
    /** Where it goes, e.g. "/account". */
    readonly url = input.required<string>();
    /** The page it goes back to, e.g. "Account". */
    readonly label = input.required<string>();

    protected readonly slide = inject(PageSlide);
}
