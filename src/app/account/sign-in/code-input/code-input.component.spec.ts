import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';
import { userEvent } from 'vitest/browser';
import { CodeInputComponent } from './code-input.component';

@Component({
    imports: [CodeInputComponent, FormField],
    template: `
        <span id="code-label">Code</span>
        <app-code-input inputId="code" labelledBy="code-label" [formField]="codeForm.code" />
        <button type="button">After</button>
    `,
})
class HostComponent {
    readonly model = signal({ code: '' });
    readonly codeForm = form(this.model);
}

describe('CodeInputComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;
    let element: HTMLElement;

    beforeEach(async () => {
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        element = fixture.nativeElement;
        document.body.appendChild(element);
        await fixture.whenStable();
        return () => {
            fixture.destroy();
            element.remove();
        };
    });

    const boxes = () => [...element.querySelectorAll<HTMLInputElement>('input')];
    const shown = () =>
        boxes()
            .map((box) => box.value || '·')
            .join('');
    const focusedBox = () => boxes().indexOf(document.activeElement as HTMLInputElement);
    const code = () => host.model().code;
    async function settle() {
        await fixture.whenStable();
    }

    it('has six boxes, named in a group, the first filled in by the phone', () => {
        expect(boxes().map((box) => box.getAttribute('aria-label'))).toEqual([
            'Digit 1 of 6',
            'Digit 2 of 6',
            'Digit 3 of 6',
            'Digit 4 of 6',
            'Digit 5 of 6',
            'Digit 6 of 6',
        ]);
        expect(element.querySelector('[role="group"]')!.getAttribute('aria-labelledby')).toBe(
            'code-label'
        );
        expect(boxes()[0].id).toBe('code');
        expect(boxes()[0].autocomplete).toBe('one-time-code');
        expect(boxes()[1].autocomplete).toBe('off');
        expect(boxes().every((box) => box.inputMode === 'numeric')).toBe(true);
    });

    it('moves on to the next box as each digit is typed', async () => {
        await userEvent.click(boxes()[0]);
        await userEvent.keyboard('12');
        expect(focusedBox()).toBe(2);
        await userEvent.keyboard('a3456');
        await settle();

        expect(code()).toBe('123456');
        expect(shown()).toBe('123456');
        expect(focusedBox()).toBe(5);
    });

    it('starts at the first empty box, wherever it is pressed', async () => {
        await userEvent.click(boxes()[4]);
        expect(focusedBox()).toBe(0);
    });

    it('fills every box from a pasted code, wherever it is pasted', async () => {
        await userEvent.click(boxes()[0]);
        await userEvent.keyboard('9');
        paste(boxes()[1], 'Your code: 123 456');
        await settle();

        expect(code()).toBe('123456');
        expect(shown()).toBe('123456');
        expect(focusedBox()).toBe(5);
    });

    it('fills every box when the phone puts the whole code in the first', async () => {
        const first = boxes()[0];
        first.focus();
        first.value = '654321';
        first.dispatchEvent(new Event('input'));
        await settle();

        expect(code()).toBe('654321');
        expect(shown()).toBe('654321');
    });

    it('clears the box before with Backspace from an empty one', async () => {
        await userEvent.click(boxes()[0]);
        await userEvent.keyboard('123{Backspace}');
        await settle();

        expect(code()).toBe('12');
        expect(focusedBox()).toBe(2);
    });

    it('clears a filled box with Backspace, leaving a gap; arrows move between boxes', async () => {
        await userEvent.click(boxes()[0]);
        await userEvent.keyboard('123{ArrowLeft}{ArrowLeft}');
        expect(focusedBox()).toBe(1);
        await userEvent.keyboard('{Backspace}');
        await settle();

        // A gap isn't a whole code
        expect(code()).toBe('1 3');
        expect(shown()).toBe('1·3···');
        expect(focusedBox()).toBe(1);

        await userEvent.keyboard('{ArrowRight}');
        expect(focusedBox()).toBe(2);
        await userEvent.keyboard('{ArrowLeft}7');
        await settle();
        expect(code()).toBe('173');
    });

    it('replaces a digit typed over', async () => {
        await userEvent.click(boxes()[0]);
        await userEvent.keyboard('123');
        await userEvent.click(boxes()[1]);
        await userEvent.keyboard('9');
        await settle();

        expect(code()).toBe('193');
        expect(shown()).toBe('193···');
    });

    it('shows a value set from outside, and empties when it is reset', async () => {
        host.model.set({ code: '4 2' });
        await settle();
        expect(shown()).toBe('4·2···');

        host.model.set({ code: '' });
        await settle();
        expect(shown()).toBe('······');
    });

    it('is touched once focus leaves all the boxes', async () => {
        await userEvent.click(boxes()[0]);
        await userEvent.keyboard('1');
        expect(host.codeForm.code().touched()).toBe(false);

        await userEvent.click(element.querySelector('button')!);
        expect(host.codeForm.code().touched()).toBe(true);
    });
});

function paste(box: HTMLInputElement, text: string) {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text', text);
    box.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true }));
}
