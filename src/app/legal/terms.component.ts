import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalPageComponent } from './legal-page.component';

/** /terms, linked from You. */
@Component({
    selector: 'app-terms',
    imports: [LegalPageComponent, RouterLink],
    templateUrl: './terms.component.html',
    styleUrl: './legal-text.scss',
})
export class TermsComponent {}
