import {
    afterNextRender,
    Component,
    computed,
    effect,
    ElementRef,
    inject,
    Injector,
    signal,
    untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { BackLinkComponent } from '../nav/back-link/back-link.component';
import { SwipeBackDirective } from '../nav/swipe-back.directive';
import { HELP_SECTIONS, searchTopics } from './help-topics';
import { counted } from '../shared/format-count';
import { IconComponent } from '../shared/components/icon/icon.component';
import { TourService } from '../tour/tour.service';

/**
 * Help (NAV-7): the questions people ask, in sections, each opening to its answer, with a
 * search over them all. From You, which it slides in over, or a ? link beside a harder part of
 * the app, which opens it on that question (`?q=<id>`), brought into view.
 */
@Component({
    selector: 'app-help',
    imports: [BackLinkComponent, IconComponent, RouterLink, SwipeBackDirective],
    templateUrl: './help.component.html',
    styleUrl: './help.component.scss',
})
export class HelpComponent {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly injector = inject(Injector);
    protected readonly tour = inject(TourService);

    /** The question opened by a ? link, if any, as the address says. */
    protected readonly opened = toSignal(
        inject(ActivatedRoute).queryParamMap.pipe(map((params) => params.get('q'))),
        { initialValue: null }
    );
    protected readonly query = signal('');

    /** The sections with any topic matching the search, each with those topics. */
    protected readonly sections = computed(() => {
        const found = new Set(searchTopics(this.query()).map(({ topic }) => topic.id));
        return HELP_SECTIONS.map((section) => ({
            ...section,
            topics: section.topics.filter((topic) => found.has(topic.id)),
        })).filter((section) => section.topics.length > 0);
    });

    /** What the search found, said to screen readers as it changes. */
    protected readonly resultText = computed(() => {
        if (!this.query().trim()) {
            return '';
        }
        const count = this.sections().reduce((sum, section) => sum + section.topics.length, 0);
        return count === 0 ? '' : counted(count, 'answer');
    });

    constructor() {
        effect(() => {
            const id = this.opened();
            if (!id) {
                return;
            }
            // Brought into view, its question focused, so it's read out
            untracked(() =>
                afterNextRender(
                    () => {
                        const topic = this.host.nativeElement.querySelector<HTMLDetailsElement>(
                            `#help-${CSS.escape(id)}`
                        );
                        if (topic) {
                            topic.open = true;
                            const summary = topic.querySelector<HTMLElement>('summary')!;
                            summary.scrollIntoView({ block: 'start' });
                            summary.focus();
                        }
                    },
                    { injector: this.injector }
                )
            );
        });
    }

    protected search(event: Event) {
        this.query.set((event.target as HTMLInputElement).value);
    }
}
