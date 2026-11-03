import { Component } from '@angular/core';
import { injectPrefersReducedMotion } from '../../reduced-motion';

/**
 * The ∞ logo: the loop draws itself in, then a light travels round it. It was the home page
 * until the tab bar took over getting about; now it's on You, under About. Decoration
 * only, so screen readers skip it. Sized by its host's width.
 */
@Component({
    selector: 'app-loop-logo',
    templateUrl: './loop-logo.component.html',
    styleUrl: './loop-logo.component.scss',
    host: { 'aria-hidden': 'true' },
})
export class LoopLogoComponent {
    protected readonly reducedMotion = injectPrefersReducedMotion();
}
