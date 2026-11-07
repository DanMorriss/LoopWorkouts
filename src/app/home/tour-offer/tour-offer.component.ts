import { Component, inject } from '@angular/core';
import { injectFocusAfterRender } from '../../shared/focus-after-render';
import { TourService } from '../../tour/tour.service';

/**
 * Today's offer of the tour (NAV-8), until it's taken or turned down on this device: Take the
 * tour, or Not now, which puts focus on the greeting as the card goes.
 */
@Component({
    selector: 'app-tour-offer',
    template: `
        @if (tour.offered()) {
            <section class="offer" aria-labelledby="tour-offer-title">
                <h3 class="offer__title" id="tour-offer-title">New here? Take a 1-minute tour</h3>
                <p class="offer__text">A quick look at each tab, and what's where.</p>
                <div class="offer__actions">
                    <button type="button" class="btn-pill" (click)="notNow()">Not now</button>
                    <button
                        type="button"
                        class="btn-main btn-main--small offer__start"
                        (click)="tour.start()"
                    >
                        Take the tour
                    </button>
                </div>
            </section>
        }
    `,
    styleUrl: './tour-offer.component.scss',
})
export class TourOfferComponent {
    protected readonly tour = inject(TourService);
    private readonly focusAfterRender = injectFocusAfterRender();

    protected notNow() {
        this.tour.stopOffering();
        this.focusAfterRender('home-title');
    }
}
